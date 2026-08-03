# 49 — Machine-Readable Capability & Decision Graph

**Status:** Architecture. The machine-readable map of what the engine can do, what it cannot do, what was decided, and where everything came from.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `03_PLUGIN_SDK_CAPABILITY_SYSTEM` (the capability registry), `05_DATA_SCHEMAS_SEMANTIC_GRAPH` (the definition graph), `06_DETERMINISM_SEEDS_REPLAY` (the fingerprint and seed streams), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the self-improvement loop's Search step), `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL` (Explanation tools query the World Oracle), `47_RESEARCH_GITHUB_DEPENDENCY_ACQUISITION` (research decisions feed the ledger)
**Read with:** `26_NPC_COGNITION_BEHAVIOR` (provenance for NPC decisions), `30_HISTORY_EVENT_SIMULATION` (provenance for historical events), `23_PROCEDURAL_GENERATION_FRAMEWORK` (provenance for generated content)

---

## 0. What this document is

The control plane (doc 43) lets the AI improve the engine. To improve the engine, the AI must know three things: **what the engine can do** (the capability graph), **what it cannot do yet** (the gap analysis), and **why the engine is the way it is** (the architectural decision ledger). This document defines the machine-readable structures that hold those three things: the `CapabilityRequirement` interface, the gap analysis, the architectural decision ledger, the World Oracle (the searchable index over all of it), and the provenance chain that traces every generated object back to its sources.

The doctrine (AGENTS.md Part 3) says: "Do not confuse the apparatus with the work." The capability graph and the decision ledger are apparatus — but they are apparatus with a specific purpose: to let the AI and the human operator answer "what is the engine?" and "why?" without re-reading every document. The World Oracle is the structural enforcement of "engage the primary source" (also Part 3) — it is the index that makes the primary source reachable.

The doctrine also says: "Cite the precedent; do not float above it." Every claim the AI makes about the engine, every Proposal it writes, every architectural decision it records, must cite the precedent — the prior decision, the existing capability, the provenance chain. The structures in this document are how the precedent is stored.

---

## 1. The CapabilityRequirement interface

A `CapabilityRequirement` is the typed record of "the engine should be able to do X." Every engine subsystem, every plugin's provided capability, every design goal in the corpus, is expressed as a `CapabilityRequirement`. The set of all requirements is the **desired capability graph**. The set of requirements with `implementationState: 'implemented'` is the **implemented capability graph**. The difference is the **gap** (section 2).

```
┌────────────────────────────────────────────────────────────────────────┐
│                THE CAPABILITY GRAPH (DAG)                               │
│                                                                        │
│   desired graph                  implemented graph                     │
│   ─────────────                  ─────────────────                     │
│   ┌──────────────┐               ┌──────────────┐                      │
│   │ render.webgpu│ ──implemented>│ render.webgpu│                      │
│   └──────┬───────┘               └──────────────┘                      │
│          │ dependsOn                                                   │
│   ┌──────v───────┐               ┌──────────────┐                      │
│   │render.webgl2 │ ──implemented>│render.webgl2 │                      │
│   └──────────────┘               └──────────────┘                      │
│                                                                        │
│   ┌──────────────┐                                                     │
│   │sim.npc.s4-60 │ ──NOT in implemented ──>  GAP                       │
│   └──────┬───────┘                                                     │
│          │ dependsOn                                                   │
│   ┌──────v───────┐               ┌──────────────┐                      │
│   │sim.npc.tiers │ ──implemented>│sim.npc.tiers │                      │
│   └──────────────┘               └──────────────┘                      │
│                                                                        │
│   gap = desired ─ implemented = work the AI does next                  │
└────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface CapabilityRequirement {
  /** A stable, unique ID. Namespaced: 'engine.render.webgpu', 'sim.npc.s4-budget'. */
  id: string;
  /** One-sentence description of what the capability is. */
  description: string;
  /** Who or what requires this capability. */
  requiredBy: string[];           // e.g. ['doc 42 §1.4', 'ga:renderer', 'vertical-slice']
  /** What other capabilities this one depends on. */
  dependsOn: string[];            // other CapabilityRequirement IDs
  /** What other capabilities depend on this one (computed). */
  requiredByCapabilities: string[];  // populated by the graph
  /** Acceptance tests — the capability is not "implemented" until these pass. */
  acceptanceTests: AcceptanceTest[];
  /** Performance budgets the implementation must meet. */
  performanceBudgets: PerformanceBudget[];
  /** Visual references — shipped games / scenes the implementation should match. */
  visualReferences: VisualReference[];
  /** Invariants the simulation must preserve when this capability is exercised. */
  simulationInvariants: SimulationInvariant[];
  /** The current implementation state. */
  implementationState: 'not-started' | 'in-progress' | 'implemented' | 'deprecated' | 'rejected';
  /** Evidence that the capability is implemented (test results, benchmarks). */
  evidence: EvidenceRef[];
  /** Known defects — the capability may be "implemented" but have known bugs. */
  knownDefects: KnownDefect[];
  /** The owning plugin (if implemented). */
  owningPlugin?: PluginId;
  /** The ledger entry that decided this capability's design. */
  decisionLedgerRef?: string;
  /** When this requirement was added. */
  addedAt: string;
  /** Who added it. */
  addedBy: string;
}

interface AcceptanceTest {
  testId: string;
  description: string;
  /** The test class — unit, integration, determinism, conformance, performance, visual. */
  testClass: 'unit' | 'integration' | 'determinism' | 'conformance' | 'performance' | 'visual';
  /** The test spec (a reference to the test file or the inline spec). */
  spec: { kind: 'file-ref' | 'inline'; ref: string };
  /** The passing condition, in one sentence. */
  passingCondition: string;
}

interface PerformanceBudget {
  metric: string;                  // 'frameTime', 'memory', 'cpuMs', etc.
  target: number;
  unit: string;
  /** The hardware profile the budget applies to. */
  profile: 'desktop-high' | 'desktop-mid' | 'mobile-high' | 'mobile-low';
  /** The scenario the budget is measured against. */
  scenario: string;
}

interface VisualReference {
  /** The shipped game / scene being referenced. */
  game: string;                    // 'Monster Hunter World', 'Death Stranding'
  /** The specific mechanic / scene / moment. */
  mechanic: string;                // 'tell animation readability'
  /** The threshold being calibrated. */
  threshold: string;               // '12 frames at 60fps'
  /** Source citation. */
  source: string;                  // 'GDC 2018 talk', 'Famitsu interview'
}

interface SimulationInvariant {
  /** The invariant, in one sentence. */
  description: string;             // 'NPC tier transitions are deterministic'
  /** How the invariant is checked. */
  checkMethod: 'checkpoint-hash' | 'replay' | 'property-test' | 'assertion';
  /** The check spec. */
  spec: string;
}

interface EvidenceRef {
  kind: 'test-run' | 'benchmark' | 'playtest' | 'visual-regression' | 'falsification';
  ref: string;                     // audit record ID or artifact ID
  capturedAt: string;
  summary: string;
}

interface KnownDefect {
  defectId: string;
  description: string;
  severity: 'low' | 'med' | 'high' | 'blocker';
  /** Whether the defect blocks the capability's "implemented" state. */
  blocksImplementation: boolean;
  /** The planned fix, if any. */
  plannedFix?: string;
  /** The issue / proposal tracking the fix. */
  trackingRef?: string;
}
```

### 1.1 Why every field

- **id, description, requiredBy, dependsOn.** The graph structure. Without these, the AI cannot traverse the graph.
- **acceptanceTests.** The capability is not "implemented" because the AI says so; it is implemented because the tests pass. The doctrine (AGENTS.md Part 3): "Exhibit reviewer voices; do not self-certify."
- **performanceBudgets.** A capability that works but is too slow is not a capability. The budget is part of the requirement.
- **visualReferences.** The doctrine (Part 3): "Cite the precedent; do not float above it." A visual capability without a precedent is aspiration, not engineering.
- **simulationInvariants.** A capability that breaks the determinism contract (doc 06) is not a capability. The invariant is part of the requirement.
- **implementationState, evidence.** The current state, with the evidence to back it. The AI does not get to assert "implemented" without evidence.
- **knownDefects.** A capability can be "implemented" with known defects, as long as the defects are recorded. Hiding defects is forbidden; recording them is required.

### 1.2 The capability graph

The set of all `CapabilityRequirement` records forms a directed acyclic graph (DAG) by `dependsOn`. The graph is queryable (section 4 — the World Oracle). The graph is the engine's self-model: it is what the engine knows about itself, in machine-readable form.

```typescript
interface CapabilityGraph {
  /** All requirements, indexed by ID. */
  requirements: Map<string, CapabilityRequirement>;
  /** The topological sort of the graph (computed). */
  topologicalOrder: string[];
  /** The roots — requirements with no dependsOn. */
  roots: string[];
  /** The leaves — requirements nothing depends on. */
  leaves: string[];
  /** The current gap (section 2). */
  gap: CapabilityGap[];
}
```

---

## 2. Gap analysis

The gap analysis is the difference between the desired capability graph and the implemented capability graph. The gap is the **missing work** — what the engine cannot yet do, but should be able to do. The gap is what the AI works on.

```typescript
interface CapabilityGap {
  /** The requirement that is not satisfied. */
  requirementId: string;
  /** The current state. */
  currentState: 'not-started' | 'in-progress' | 'implemented-with-defects' | 'deprecated';
  /** The desired state (always 'implemented'). */
  desiredState: 'implemented';
  /** What is missing, in one sentence. */
  description: string;
  /** The blocking defects, if any. */
  blockingDefects: string[];
  /** The missing acceptance tests, if any. */
  missingTests: string[];
  /** The missing evidence, if any. */
  missingEvidence: string[];
  /** The estimated effort, in role-hours. */
  estimatedEffort?: { role: ArchitectRole; hours: number }[];
  /** The priority (computed from requiredBy and dependsOn). */
  priority: 'low' | 'med' | 'high' | 'critical';
}

function computeGap(graph: CapabilityGraph): CapabilityGap[] {
  const gaps: CapabilityGap[] = [];
  for (const req of graph.requirements.values()) {
    if (req.implementationState === 'implemented' && req.knownDefects.every(d => !d.blocksImplementation)) {
      continue;  // satisfied
    }
    gaps.push({
      requirementId: req.id,
      currentState: req.implementationState,
      desiredState: 'implemented',
      description: req.description,
      blockingDefects: req.knownDefects.filter(d => d.blocksImplementation).map(d => d.defectId),
      missingTests: req.acceptanceTests.filter(t => !evidenceCoversTest(req.evidence, t)).map(t => t.testId),
      missingEvidence: req.evidence.length === 0 ? ['no-evidence'] : [],
      estimatedEffort: estimateEffort(req),
      priority: computePriority(req, graph),
    });
  }
  return gaps;
}
```

### 2.1 How the AI uses the gap

The gap is the AI's work queue. When the AI enters the self-improvement loop (doc 43 §4), it picks a gap (highest priority, smallest effort), enters the loop, and produces a Proposal that addresses the gap. The Proposal's `addressesGap` field (doc 43 §4.1) references the gap. When the Proposal's transaction commits, the gap's `currentState` updates to `implemented`, the evidence is recorded, and the gap is removed from the work queue.

### 2.2 Why the gap is not just "open issues"

A bug tracker is a flat list of issues. The capability graph is a DAG with dependencies, acceptance tests, evidence, and known defects. The difference is structural: a bug tracker tells you "what is broken"; the capability graph tells you "what is broken, what depends on it being fixed, what evidence would prove it fixed, and what the priority is relative to everything else." The capability graph is the work queue the AI can reason about; a bug tracker is the work queue a human reasons about.

---

## 3. The architectural decision ledger

Every non-trivial architectural decision is recorded in the **architectural decision ledger**. The ledger is the engine's institutional memory: it records what was decided, why, what alternatives were considered, what the drawbacks are, and what would trigger reconsideration. The AI consults the ledger before proposing a change (step 4 of the self-improvement loop — Search); if a precedent exists, the AI cites it; if the precedent is being revisited, the AI cites the reconsideration trigger.

```typescript
interface ArchitecturalDecision {
  /** The decision ID, namespaced: 'decision:render.webgpu-choice'. */
  decisionId: string;
  /** The problem being decided. */
  problem: string;
  /** The context — what was the state of the engine, the project, the world when this was decided. */
  context: string;
  /** The options considered. */
  optionsConsidered: {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
  }[];
  /** The selected approach. */
  selectedApproach: string;
  /** Why this approach was selected (first-person, signed). */
  why: string;
  /** The known drawbacks of the selected approach. */
  knownDrawbacks: string[];
  /** The systems affected by this decision. */
  affectedSystems: string[];       // capability IDs, plugin IDs, doc references
  /** What would trigger reconsideration. */
  reconsiderationTriggers: string[];
  /** The date the decision was made. */
  date: string;
  /** The engine version at the time of the decision. */
  engineVersion: string;
  /** The deciders (first-person, signed). */
  deciders: { role: ArchitectRole | 'human'; principalId: string; signedAt: string }[];
  /** The dissenters (if any — quoted, signed). */
  dissenters?: { principalId: string; objection: string; signedAt: string }[];
  /** The status of the decision. */
  status: 'active' | 'superseded' | 'deprecated';
  /** If superseded, by which decision. */
  supersededBy?: string;
  /** References to related decisions. */
  relatedDecisions: string[];
  /** References to the capability graph. */
  capabilityRefs: string[];
}
```

### 3.1 Why the ledger is non-negotiable

The doctrine (AGENTS.md Part 3) says: "Make decisions; do not defer in the name of rigor." The ledger is the structural enforcement of "make decisions" — every decision is recorded, every alternative is named, every drawback is owned. A future AI (or human) that questions the decision finds the ledger entry, reads the rationale, and either accepts it or triggers reconsideration per the documented triggers.

The doctrine also says (Part 3): "Exhibit reviewer voices; do not self-certify." The `dissenters` field is the structural enforcement of that doctrine for decisions: if a reviewer disagreed, the disagreement is quoted and signed, not buried. A decision with no dissenters is a decision that may not have been reviewed; a decision with quoted dissent is a decision that was.

### 3.2 Reconsideration triggers

A decision is not forever. Each decision records the conditions under which it should be revisited:

- **A dependency changes.** "If Three.js deprecates the WebGPU backend, reconsider the renderer abstraction."
- **A performance budget is exceeded.** "If the simulation budget exceeds 5ms on desktop-high, reconsider the S4 NPC tier."
- **A new option emerges.** "If a deterministic physics solver with browser WASM support becomes available, reconsider Jolt."
- **A defect is discovered.** "If a save-corruption bug is traced to this decision, reconsider immediately."
- **Time passes.** "Reconsider in 12 months, regardless." (Some decisions are time-bounded.)

The AI checks the triggers before each self-improvement loop; a triggered decision is flagged for reconsideration. The reconsideration is itself a new decision (which supersedes the old one, with `supersededBy`).

### 3.3 The ledger is append-only

Decisions are not deleted. A superseded decision stays in the ledger, with `status: 'superseded'` and a pointer to the superseding decision. The history is the point — the ledger shows not just what was decided, but how the decisions evolved. A future investigator (AI or human) can trace the evolution of any architectural choice.

---

## 4. The World Oracle

The World Oracle is the searchable index over the capability graph, the decision ledger, the plugin registry, the definition graph, and the runtime state. It is the AI's interface to "everything the engine knows about itself." The Explanation tools (doc 44 §6) query the World Oracle; the self-improvement loop's Search step (doc 43 §4 step 4) queries the World Oracle.

The World Oracle uses a URL-like scheme to address its contents:

```
engine://architecture/<doc-id>           → engine architecture docs
engine://capabilities/<capability-id>    → a CapabilityRequirement
engine://plugins/<plugin-id>             → a plugin's manifest + state
engine://decisions/<decision-id>         → an ArchitecturalDecision
engine://gap                             → the current capability gap
engine://fingerprint                     → the determinism fingerprint

world://cosmology                        → the world's cosmology (doc 24)
world://regions/<region-id>              → a region's state
world://factions/<faction-id>            → a faction's state
world://entities/<entity-id>             → an entity's full record
world://definitions/<definition-id>      → a definition (doc 05)

runtime://scene                          → the current scene graph
runtime://physics/contacts               → active physics contacts
runtime://tick                           → the current tick
runtime://seed                           → the active seed and RNG state

provenance://<object-id>                 → the provenance chain for any object (section 5)
```

```typescript
interface WorldOracle {
  /** Query the oracle by URL or by structured query. */
  query(query: OracleQuery): Promise<OracleResult>;
  /** Resolve a URL to its object. */
  resolve(url: string): Promise<unknown>;
  /** Full-text search across all indexed content. */
  search(text: string, opts?: OracleSearchOpts): Promise<OracleSearchHit[]>;
}

interface OracleQuery {
  /** A URL, or a structured query. */
  url?: string;
  /** Structured query (one of). */
  structured?:
    | { kind: 'capability'; filter: CapabilityFilter }
    | { kind: 'decision'; filter: DecisionFilter }
    | { kind: 'plugin'; filter: PluginFilter }
    | { kind: 'definition'; filter: DefinitionFilter }
    | { kind: 'entity'; filter: EntityFilter }
    | { kind: 'provenance'; targetId: string }
    | { kind: 'gap' };
}

interface OracleResult {
  url: string;
  object: unknown;
  /** Related objects, for navigation. */
  related: { url: string; relation: string }[];
  /** When this object was last updated. */
  updatedAt: string;
}

interface OracleSearchHit {
  url: string;
  snippet: string;
  score: number;
  kind: 'capability' | 'decision' | 'plugin' | 'definition' | 'doc' | 'entity';
}
```

```
┌────────────────────────────────────────────────────────────────────────┐
│                THE WORLD ORACLE (URL SPACES)                            │
│                                                                        │
│   engine://                  world://                  runtime://       │
│   ──────────                 ────────                  ──────────       │
│   architecture/00-49         cosmology                 scene            │
│   capabilities/<id>          regions/<id>              physics/contacts │
│   plugins/<id>               factions/<id>             tick             │
│   decisions/<id>             entities/<id>             seed             │
│   gap                        definitions/<id>                           │
│   fingerprint                                                            │
│                                                                        │
│   provenance://<object-id>  (cross-cutting; any object's chain)        │
│                                                                        │
│   The Oracle federates all four spaces into a single query interface.  │
│   Cross-space queries (e.g. "which decisions affected this capability, │
│   and which plugins implement it?") are resolved at index time.        │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 What the World Oracle indexes

- **Engine architecture docs** (this corpus, docs 00-49). Full-text indexed, with section-level addressing (`engine://architecture/43#section-5`).
- **The capability graph.** Every `CapabilityRequirement`, queryable by ID, by `implementationState`, by `requiredBy`, by `dependsOn`.
- **The decision ledger.** Every `ArchitecturalDecision`, queryable by ID, by `affectedSystems`, by `status`.
- **The plugin registry.** Every plugin's manifest, state, capabilities.
- **The definition graph** (doc 05). Every definition, template, rule.
- **Runtime state.** The current scene, physics, tick, seed — queryable, but not cached (the runtime changes every tick).
- **Provenance** (section 5). Every generated object's provenance chain.

### 4.2 Why a single Oracle, not separate indexes

The doctrine (AGENTS.md Part 1) says: "Keep components modular and concerns clearly separated." The World Oracle is one component, but it indexes many sources. The alternative — separate indexes per source, queried in turn — produces the standard problem of federated search: the AI has to know which index to ask, and cross-source queries (e.g., "which decisions affected this capability, and which plugins implement it?") require the AI to do the federation. The World Oracle does the federation once, at index time, so the AI's queries are simple.

---

## 5. Provenance for every generated object

Every object the engine generates — every entity, every region, every NPC relationship, every terrain chunk, every historical event, every save — has a **provenance chain**. The provenance chain is the structural answer to "where did this come from?" It traces the object back to its sources: the definitions, the templates, the rules, the seed streams, the plugin versions, the historical modifications, and the code version that produced it.

```typescript
interface ProvenanceChain {
  /** The object this chain describes. */
  objectId: string;
  /** The object's type. */
  objectType: 'entity' | 'region' | 'chunk' | 'relationship' | 'event' | 'save' | 'asset' | 'other';
  /** The chain, in reverse chronological order (most recent first). */
  entries: ProvenanceEntry[];
  /** The hash of the chain, for tamper-evidence. */
  chainHash: string;
}

interface ProvenanceEntry {
  /** When this entry was created. */
  tick: bigint;
  /** What kind of provenance this is. */
  kind: ProvenanceKind;
  /** The source reference. */
  source: ProvenanceSource;
  /** A human-readable description. */
  description: string;
}

type ProvenanceKind =
  | 'generated'             // produced by a generator stage
  | 'derived'               // derived from another object (e.g., a relationship from two NPCs)
  | 'modified'              // modified by a command (player or AI)
  | 'migrated'              // transformed by a save migration
  | 'imported';             // imported from external data

interface ProvenanceSource {
  /** The plugin that produced this entry. */
  pluginId: PluginId;
  /** The plugin version at the time. */
  pluginVersion: string;
  /** The engine version at the time. */
  engineVersion: string;
  /** The engine fingerprint at the time. */
  engineFingerprint: string;
  /** The generator stage, if generated. */
  generatorStage?: string;
  /** The seed stream, if generated. */
  seedStream?: string;
  /** The definition IDs that governed generation, if any. */
  definitionIds?: string[];
  /** The template IDs that governed generation, if any. */
  templateIds?: string[];
  /** The rule IDs that fired, if any. */
  ruleIds?: string[];
  /** The command that modified this, if modified. */
  commandRef?: string;
  /** The historical modification's author, if modified by AI or human. */
  author?: { kind: 'ai' | 'human' | 'system'; principalId: string };
  /** The code version (git SHA) at the time. */
  codeVersion: string;
}
```

### 5.1 What provenance is recorded

For every generated object, the chain records:

- **Source definitions.** Which definitions governed the object's generation. (`provenance://entity-12345` → `ga:bestiary.spirit-fox`.)
- **Templates.** Which templates were applied. (`provenance://entity-12345` → `ga:templates.fox-difficult-encounter`.)
- **Rules.** Which rules fired during generation. (`provenance://entity-12345` → `ga:rules.spawn-fox-in-spirit-wilds`.)
- **Seed streams.** Which deterministic seed stream produced the object. (`provenance://entity-12345` → `seed:region-7/encounter-stream/42`.)
- **Plugin versions.** Which version of which plugin produced the object. (`ga:bestiary@1.4.2`.)
- **Historical modifications.** Every command that modified the object after generation, with the author (AI principal, human, or system) and the code version at the time.
- **Code version.** The git SHA of the engine at the time of generation or modification.

### 5.2 Why provenance is non-negotiable

The doctrine (AGENTS.md Part 3) says: "Engage the primary source, not the secondary summary." Provenance is the structural enforcement of that doctrine for engine-generated objects. When the AI asks `world.whyDoesThisExist` (doc 44 §6) about a spirit fox, the answer is not "it's a spirit fox" — it is the full provenance chain: the definition that governed its generation, the template that set its stats, the rule that fired, the seed stream that produced its instance, the plugin version, the code version, and every modification since. The AI reasons about primary sources, not summaries.

Provenance is also the structural answer to "is this object reproducible?" If the chain is intact, the object can be re-generated from the seed and the sources; if the chain is broken (a definition was deleted, a plugin was upgraded incompatibly), the object is not reproducible, and the engine flags it.

### 5.3 Provenance and the determinism contract

Provenance is closely tied to the determinism contract (doc 06). The engine fingerprint in the provenance source is the same fingerprint that gates save compatibility. A save with fingerprint X can be replayed only if the engine produces the same fingerprint X; the provenance chain tells the AI which fingerprint produced which object, so the AI knows which objects are at risk when the fingerprint changes.

---

## 6. Failure cases

| Failure | Detection | Response |
|---|---|---|
| Capability graph has a cycle | Topological sort fails | The graph is rejected at registration; the offending edge is reported |
| Capability requirement references unknown ID | Reference check | The requirement is rejected at registration |
| Decision ledger references unknown capability | Reference check | The decision is registered but flagged |
| World Oracle index out of sync | Index version check | The Oracle refuses queries until re-indexed; re-index is automatic on engine boot |
| Provenance chain broken (missing source) | Chain verification | The object is flagged `provenance-broken`; the AI is warned |
| Provenance chain hash mismatch | Hash verification | Tamper-evidence failure; security incident declared |
| Oracle query times out | Query timeout | The Oracle returns partial results with a warning |
| Gap analysis produces empty gap | All requirements implemented | The engine reports `no-gaps`; the AI may consider new requirements |
| Decision ledger supersession chain breaks | `supersededBy` reference check | The orphaned decision is flagged for review |

---

## 7. Rejected alternatives

### 7.1 "Free-form documentation, no machine-readable graph"

The first design: the engine's self-model is the documentation (this corpus, docs 00-49); the AI reads the docs and reasons. Rejected because (a) free-form docs are not queryable — the AI cannot ask "what depends on this capability?" and get a precise answer; (b) the docs drift from the implementation as the engine evolves, with no structural check; (c) the doctrine (AGENTS.md Part 3) says: "Do not confuse the apparatus with the work." The docs are apparatus; the capability graph is the work, in machine-readable form. The docs explain the graph; the graph is the truth.

### 7.2 "A flat issue tracker, not a capability DAG"

The second design: the engine's work queue is a flat list of issues (GitHub Issues, Jira). Rejected per section 2.2 — a flat list does not capture dependencies, acceptance tests, evidence, or known defects structurally. The capability graph is a DAG with all of those; a flat list is a poor approximation.

### 7.3 "Decisions are recorded in commit messages"

The third design: architectural decisions are recorded in the commit messages of the code that implements them. Rejected because (a) commit messages are scattered across the codebase, not queryable as a ledger; (b) commit messages record what changed, not what alternatives were considered or why the selected approach was chosen; (c) commit messages do not record reconsideration triggers, so future maintainers do not know when to revisit. The decision ledger is a separate, structured record; commit messages reference it (`decision: render.webgpu-choice`), but they do not replace it.

### 7.4 "Provenance is best-effort, not required"

The fourth design: provenance is recorded when convenient, but not required for every object. Rejected because (a) "best-effort provenance" is "no provenance" in practice — the objects that need it most (the ones the AI is debugging) are the ones whose provenance is missing; (b) the determinism contract (doc 06) requires reproducibility, and reproducibility requires provenance; (c) the doctrine (AGENTS.md Part 3) says: "Engage the primary source, not the secondary summary." Without provenance, the AI cannot engage the primary source for any generated object. Provenance is required, full stop.

### 7.5 "The World Oracle is a SQL database"

The fifth design: the World Oracle is a SQL database, queried with SQL. Rejected because (a) SQL is a poor fit for graph queries (the capability graph and the provenance chain are graphs, not tables); (b) the Oracle addresses heterogeneous sources (docs, capabilities, decisions, plugins, definitions, runtime, provenance) that do not share a schema; (c) the URL scheme (`engine://`, `world://`, `runtime://`, `provenance://`) is a more AI-friendly interface than SQL — the AI can construct URLs from context. The Oracle may use SQL internally (for the indexed content), but its query interface is the URL scheme and the structured query, not raw SQL.

### 7.6 "The capability graph is auto-derived from code"

The sixth design: the capability graph is auto-derived from the code (e.g., by parsing the plugin manifests and the type system). Rejected because (a) the code captures what is implemented, not what is required — the gap analysis (section 2) requires the desired graph, which is not in the code; (b) the code does not capture acceptance tests, performance budgets, visual references, or simulation invariants — those are design intent, not implementation; (c) auto-derivation produces a graph that is only as good as the code's structure, which is poor for a system that is partly implemented. The capability graph is hand-authored (by the AI or the human), with the implementation state updated as the code evolves.

---

## 8. What this document enables

The machine-readable capability and decision graph as specified here enables:

- **A capability graph** that captures what the engine can do, what it cannot do, and what depends on what (section 1).
- **A gap analysis** that produces the AI's work queue, with priorities and effort estimates (section 2).
- **An architectural decision ledger** that records every non-trivial decision, with alternatives, drawbacks, and reconsideration triggers (section 3).
- **A World Oracle** that makes all of the above searchable, by URL or by structured query (section 4).
- **A provenance chain** for every generated object, tracing it back to its definitions, templates, rules, seeds, plugins, and code versions (section 5).

The doctrine (AGENTS.md Part 3) says: "Cite the precedent; do not float above it." The structures in this document are how the precedent is stored, indexed, and cited. Every Proposal the AI writes cites a capability requirement; every decision the AI records cites the alternatives; every explanation the AI gives cites the provenance. The engine's self-model is the structural enforcement of the doctrine at the level of the AI's own reasoning.

The doctrine also says (Part 3): "Build the engine, not just the brake." The capability graph and the decision ledger are engine — they are the engine's knowledge of itself, in a form the AI can use. The brake is the requirement that the AI cite the precedent; the engine is the precedent itself, made machine-readable. Both are present, both are necessary, and the engine — the work the AI does on the engine — is what they serve.
