# 44 — Architect Tool & Resource Protocol

**Status:** Architecture. The Internal Architect Protocol and the tool registry through which the AI calls engine functions.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `02_KERNEL_LIFECYCLE` (PluginHost), `03_PLUGIN_SDK_CAPABILITY_SYSTEM` (capability registry), `10_EVENTS_COMMANDS_QUERIES_TRANSACTIONS` (command path), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the control plane this protocol serves)
**Read with:** `45_BROWSER_VLM_OBSERVATION_VISUAL_QA` (the VLM tool family), `46_AUTONOMOUS_CHANGE_VALIDATION_PROMOTION` (Execution tools feed the validation pipeline), `48_AI_PERMISSIONS_SECURITY_AUDIT` (the permission model behind tool authorization), `49_MACHINE_READABLE_CAPABILITY_DECISION_GRAPH` (Explanation tools query the World Oracle)

---

## 0. What this document is

The control plane (doc 43) is the architecture. The protocol in this document is the wire: the calls the AI makes, the responses it receives, the schemas that govern them, and the registry that records what tools exist. Every capability the AI has — inspect a chunk, patch a definition, run a simulation year, trace a pixel — is a **tool** in this protocol. Tools are typed, schema-validated, permission-gated, budget-bounded, audit-logged. The protocol is the contract between the AI and the engine.

The doctrine (AGENTS.md Part 1) says: "Choose the simplest implementation that fully meets the current requirements." The simplest protocol that meets the requirements (typed calls, streaming results, long-running operations, audit, permissions, multi-transport) is JSON-RPC 2.0 over WebSocket for the command channel, with a native TypeScript SDK that wraps it, an optional REST surface for human curl-ability, and an optional Model Context Protocol (MCP) adapter for AI frameworks that prefer that surface. One protocol, four entry points. The entry points are thin; the protocol is the substance.

The doctrine also says (AGENTS.md Part 3): "Add exits, not gates." The tool proposal system (section 7) is the exit: the AI is not limited to the tools the engine shipped with. It can propose new tools — with typed schemas, permissions, tests, runtime budgets, and security review — and the engine can adopt them. The proposal system is how the control plane grows.

---

## 1. The Internal Architect Protocol

The Internal Architect Protocol (IAP) is the canonical form of every tool call. Every transport — WebSocket, REST, MCP — translates to and from IAP. The Gateway (doc 43 §3) speaks IAP natively; the transports are adapters.

```typescript
interface IapRequest {
  /** JSON-RPC 2.0 method name, namespaced: 'engine.describe', 'definition.patch'. */
  method: string;
  /** JSON-RPC 2.0 params object, validated against the tool's input schema. */
  params: Record<string, unknown>;
  /** JSON-RPC 2.0 id (string or number). */
  id: string | number;
  /** The IAP envelope: session, autonomy, capability token, deadline. */
  meta: IapMeta;
}

interface IapResponse {
  /** Matches the request id. */
  id: string | number;
  /** The result, present on success. */
  result?: unknown;
  /** The error, present on failure. */
  error?: IapError;
  /** The audit record (always present, even on error). */
  meta: { audit: AuditRecord };
}

interface IapError {
  code: number;
  message: string;
  data?: {
    /** A machine-readable error kind. */
    kind: 'PermissionDenied' | 'AutonomyExceeded' | 'SchemaInvalid'
        | 'ToolNotFound' | 'BudgetExceeded' | 'DeadlineExceeded'
        | 'InternalError' | 'Cancelled' | 'Conflict' | 'NotFound';
    details?: unknown;
  };
}

interface IapMeta {
  sessionId: string;
  assertedAutonomy: AutonomyLevel;
  capabilityToken: string;
  deadlineMs: number;
  /** For long-running tools, the async handle to poll or cancel. */
  asyncHandle?: string;
}
```

### 1.1 The four transports

```
┌──────────────────────────────────────────────────────────────────────┐
│                      TRANSPORTS (all speak IAP)                       │
│                                                                      │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│   │ TypeScript   │   │  WebSocket   │   │    REST      │           │
│   │    SDK       │   │ JSON-RPC 2.0 │   │  HTTP/JSON   │           │
│   │ (native)     │   │  (primary)   │   │ (fallback)   │           │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘           │
│          │                  │                  │                    │
│          └──────────┬───────┴──────────┬───────┘                    │
│                     v                  v                            │
│            ┌────────────────────────────────────┐                   │
│            │       ARCHITECT GATEWAY            │                   │
│            │   (translates transport → IAP)     │                   │
│            └────────────────┬───────────────────┘                   │
│                             │                                         │
│                             v                                         │
│            ┌────────────────────────────────────┐                   │
│            │      OPTIONAL MCP ADAPTER          │                   │
│            │   (exposes IAP tools as MCP)       │                   │
│            └────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

- **TypeScript SDK (native).** The primary surface for AI code running on the same host as the Gateway. Provides typed wrappers for every tool, autocomplete, schema validation at compile time. This is what `ga:architect-sdk` ships as.
- **WebSocket / JSON-RPC 2.0.** The primary surface for remote AI agents. Bidirectional; supports server-pushed progress for long-running tools; supports cancellation. The SDK uses this transport under the hood.
- **REST / HTTP / JSON.** The fallback surface. One endpoint per tool family (`POST /inspect`, `POST /edit`, `POST /execute`, `POST /explain`). Long-running tools return a `202` with a job handle that the client polls. Used for human curl-ability and for AI frameworks that do not speak WebSocket.
- **MCP adapter.** Optional. Exposes the IAP tool registry as an MCP server, so an AI framework that speaks MCP (Claude, others) can use the engine's tools without a custom adapter. The MCP adapter is read-mostly by default; state-mutating tools require an explicit capability token, same as the other transports.

### 1.2 Why JSON-RPC, not gRPC or GraphQL

gRPC was rejected: HTTP/2 + protobuf codegen is a poor fit for a browser-native engine with TypeScript/Python clients. GraphQL was rejected: the AI's access pattern is whole-tool-results, not sliced projections, so the schema complexity is not justified. JSON-RPC 2.0 is the simplest protocol that meets the requirements: one method per tool, one params object, one result, one error, batched calls, transport-agnostic. MCP is supported as an adapter (section 1.1), not a primary, because MCP presupposes a tool registry — which is what this document defines.

### 1.3 Streaming and long-running tools

Some tools are long-running: `simulation.runYears` may take minutes; `playtest.launch` may take an hour; `benchmark.run` may take 20 minutes. These tools return an **async handle** immediately, and the AI receives progress events over the WebSocket (or polls the REST endpoint).

```typescript
interface AsyncHandle {
  handle: string;
  /** The tool that produced this handle. */
  tool: string;
  /** The estimated total work, in arbitrary units. */
  estimatedTotal: number;
  /** The current progress. */
  current: number;
  /** The current status. */
  status: 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';
  /** A stream of progress events, for WebSocket clients. */
  progress: AsyncProgress[];
}

interface AsyncProgress {
  timestamp: string;
  /** What just happened, in human-readable terms. */
  message: string;
  /** Optional structured data. */
  data?: unknown;
}
```

The AI may cancel an async tool with `engine.cancel(handle)`. Cancellation is best-effort: the engine stops scheduling new work for the tool, but in-flight work completes. The audit log records both the cancellation request and the actual termination.

---

## 2. The tool registry

Every tool the AI can call is registered. The registry is the source of truth: if a tool is not in the registry, the Gateway refuses the call. The registry is populated at engine boot by plugins (which register their tools during `init`) and by the tool proposal system (section 7).

```typescript
interface ToolRegistration {
  /** The tool name, namespaced: 'engine.describe', 'definition.patch'. */
  tool: string;
  /** One-line description, for the AI's tool-selection step. */
  description: string;
  /** The category — see section 3. */
  category: ToolCategory;
  /** The input schema (JSON Schema). */
  input: JsonSchema;
  /** The output schema (JSON Schema). */
  output: JsonSchema;
  /** The permissions required to call this tool. */
  requiresPermissions: ToolPermission[];
  /** The autonomy level required to call this tool. */
  requiresAutonomy: AutonomyLevel;
  /** Whether this tool mutates engine state. */
  mutatesState: boolean;
  /** The runtime budget (max wall-clock ms, max CPU ms, max memory MiB). */
  budget: ToolBudget;
  /** Whether the tool is long-running (returns an async handle). */
  longRunning: boolean;
  /** The plugin that registered this tool. */
  registeredBy: PluginId;
  /** The semantic version of the tool's schema. */
  schemaVersion: string;
  /** Tests proving the tool works (see section 7). */
  tests: ToolTestRef[];
}

type ToolCategory =
  | 'Inspection'         // read-only; section 3
  | 'ControlledEditing'  // mutates; section 4
  | 'Execution'          // runs engine work; section 5
  | 'Explanation';       // causal tracing; section 6

interface ToolBudget {
  maxWallClockMs: number;
  maxCpuMs: number;
  maxMemoryMiB: number;
  /** For long-running tools, the max total wall-clock before forced cancel. */
  maxTotalMs?: number;
}
```

### 2.1 Tool discovery

The AI discovers tools through the `engine.describe` tool (which is itself a tool — a meta-tool). `engine.describe` returns the registry, optionally filtered by category, permission, or autonomy. The AI uses this to know what it can call.

```typescript
interface EngineDescribeParams {
  category?: ToolCategory;
  requiresAutonomy?: AutonomyLevel;
  prefix?: string;  // filter by tool name prefix, e.g. 'definition.'
}

interface EngineDescribeResult {
  tools: ToolRegistration[];
  /** The engine version and fingerprint. */
  engine: { version: string; fingerprint: string };
  /** The current session's capabilities. */
  session: { capabilities: string[]; autonomy: AutonomyLevel };
}
```

---

## 3. Inspection tools (read-only)

Inspection tools are the AI's eyes into engine state. They are read-only, always available at the `Observe` autonomy level, and have generous budgets (state is cheap to read). They are the tools the AI calls first, before any change.

```typescript
// engine.describe — the registry, as above.

// plugin.inspect — inspect a plugin's manifest, state, and recent events.
interface PluginInspectParams {
  pluginId: PluginId;
  include?: 'manifest' | 'state' | 'events' | 'capabilities' | 'all';
  eventLimit?: number;  // default 50
}
interface PluginInspectResult {
  manifest: PluginManifest;
  state: unknown;
  events: { tick: bigint; type: string; payload: unknown }[];
  capabilities: CapabilityDeclaration[];
}

// world.query — query the world state graph (entities, components, regions).
interface WorldQueryParams {
  filter: WorldFilter;  // by region, by component, by tag, by tier
  projection?: string[];  // which fields to return
  limit?: number;  // default 100, max 1000
}
interface WorldQueryResult {
  entities: { entityId: number; components: Record<string, unknown> }[];
  /** A cursor for pagination, if more results exist. */
  nextCursor?: string;
}

// runtime.inspectEntity — deep inspection of one entity.
interface RuntimeInspectEntityParams {
  entityId: number;
  include?: 'components' | 'schedule' | 'relationships' | 'recentEvents' | 'all';
}
interface RuntimeInspectEntityResult {
  entity: EntityInfo;
  schedule?: ScheduleSlice;
  relationships?: RelationshipGraph;
  recentEvents?: { tick: bigint; type: string; payload: unknown }[];
}

// terrain.inspectChunk — inspect a terrain chunk's density, biomes, edits.
interface TerrainInspectChunkParams {
  chunkId: string;  // "rx,rz" at the chunk grid resolution
  layer?: 'density' | 'biome' | 'material' | 'edits' | 'all';
}
interface TerrainInspectChunkResult {
  chunkId: string;
  bounds: AABB;
  density?: Float32Array;  // serialized as base64
  biome?: Uint8Array;
  edits?: TerrainEdit[];
}

// physics.inspectCollider — inspect a collider's shape, contacts, constraints.
interface PhysicsInspectColliderParams {
  colliderId: number;
  include?: 'shape' | 'contacts' | 'constraints' | 'all';
}
interface PhysicsInspectColliderResult {
  shape: ColliderShape;
  contacts: ContactPoint[];
  constraints: ConstraintDesc[];
}

// profiler.capture — capture a profiling span for a duration.
interface ProfilerCaptureParams {
  durationMs: number;  // max 10_000
  categories?: string[];  // e.g. ['render', 'sim', 'gc']
}
interface ProfilerCaptureResult {
  trace: ProfilerTrace;  // Chrome Trace Event format
  summary: { category: string; totalMs: number; pct: number }[];
}
```

### 3.1 Inspection is non-deterministic-safe

Inspection tools never mutate state. They are safe to call mid-tick, do not appear in the input log, and do not affect the determinism hash. This is enforced: Inspection tools are marked `mutatesState: false`, and the Gateway runs them against a read-only snapshot.

### 3.2 Inspection failure cases

- **Entity not found.** `runtime.inspectEntity` returns `NotFound` with the requested ID.
- **Chunk not loaded.** `terrain.inspectChunk` returns the chunk's metadata if known, but the density/biome arrays are absent — the AI must trigger a load (an Execution tool) first.
- **Profiler quota exceeded.** The profiler has a fixed buffer; a capture longer than the buffer wraps around. The result's `summary.truncated` field warns the AI.
- **Query too broad.** `world.query` with no filter returns `SchemaInvalid` — the AI must specify at least one filter dimension.

---

## 4. Controlled Editing tools (mutating)

Controlled Editing tools mutate engine state. They are gated by autonomy (minimum `Sandbox`), they require explicit capability tokens, they are audit-logged in full (input + output + diff), and they operate on the isolated workspace (doc 46 §1), never on the main branch directly.

```typescript
// definition.create — create a new definition in the definition graph.
interface DefinitionCreateParams {
  definitionId: string;
  kind: DefinitionKind;  // 'species' | 'faction' | 'item' | 'technique' | ...
  source: DefinitionSource;  // the human-readable + machine-readable form
  bibleRefs?: string[];
}
interface DefinitionCreateResult {
  definition: Definition;
  audit: { before: null; after: Definition };
}

// definition.patch — patch an existing definition.
interface DefinitionPatchParams {
  definitionId: string;
  patch: JsonPatch;  // RFC 6902
  reason: string;  // human-readable, recorded in the audit log
}
interface DefinitionPatchResult {
  definition: Definition;
  audit: { before: Definition; after: Definition; patch: JsonPatch };
}

// template.create — create a content template (entity, scene, encounter).
interface TemplateCreateParams {
  templateId: string;
  kind: TemplateKind;  // 'entity' | 'scene' | 'encounter' | 'dialogue' | ...
  body: unknown;  // typed by kind
}
interface TemplateCreateResult {
  template: Template;
}

// plugin.scaffold — scaffold a new plugin (file structure + manifest).
interface PluginScaffoldParams {
  pluginId: PluginId;  // "author:name"
  template: 'blank' | 'system' | 'renderer' | 'generator' | 'mod';
  provides: CapabilityDeclaration[];
  requires: CapabilityRequirement[];
}
interface PluginScaffoldResult {
  pluginPath: string;  // in the workspace
  manifest: PluginManifest;
  files: string[];
}

// asset.import — import an asset into the workspace's staging area.
interface AssetImportParams {
  source: { kind: 'url' | 'file' | 'inline'; ref: string };
  kind: AssetKind;  // 'mesh' | 'texture' | 'audio' | 'animation' | 'shader'
  meta?: Record<string, unknown>;
}
interface AssetImportResult {
  assetRef: AssetRef;  // content-addressed hash
  warnings?: string[];  // e.g. "texture is not power-of-two"
}

// animation.patchGraph — patch an animation graph (state machine, blend tree).
interface AnimationPatchGraphParams {
  graphId: string;
  patch: AnimationGraphPatch;  // typed by the animation plugin
}
interface AnimationPatchGraphResult {
  graph: AnimationGraph;
}

// vfx.patchRecipe — patch a VFX recipe (emitters, forces, ribbons).
interface VfxPatchRecipeParams {
  recipeId: string;
  patch: VfxRecipePatch;
}
interface VfxPatchRecipeResult {
  recipe: VfxRecipe;
}
```

### 4.1 The controlled-editing contract

Every Controlled Editing tool:

1. Operates on the **current workspace**, never on main. The workspace is bound to the session; tools cannot escape it.
2. Returns an `audit` object that includes the before-state, the after-state, and the patch applied. The Gateway records this in the audit log.
3. Is **idempotent** where possible. `definition.patch` with the same patch on the same baseline produces the same result; `definition.create` with the same ID is a `Conflict` error.
4. Is **reversible** within the workspace (via the workspace's undo log) until the workspace is committed.

### 4.2 Controlled-editing failure cases

- **Workspace not initialized.** All Controlled Editing tools return `Conflict` if the session has no open workspace. The AI must call `workspace.open` (an Execution tool) first.
- **Patch does not apply.** `definition.patch` returns `Conflict` with the failing operation index and the reason.
- **Schema violation.** The patched definition must satisfy the plugin's schema; otherwise `SchemaInvalid`.
- **Permission missing.** The session's capability token must include the specific edit permission (`edit:definition`, `edit:template`, `scaffold:plugin`, `import:asset`, etc.). See doc 48.
- **Budget exceeded.** Each Controlled Editing tool has a budget; large patches that exceed it return `BudgetExceeded`. The AI must split the work.

---

## 5. Execution tools (running engine work)

Execution tools run engine work: builds, tests, simulations, benchmarks, visual regressions, playtests. They are long-running, return async handles, and feed the transactional change process (doc 43 §6).

```typescript
// build.preview — build the workspace into a preview bundle.
interface BuildPreviewParams {
  target: 'web' | 'node' | 'worker';
  optimization: 'dev' | 'preview' | 'release';
}
interface BuildPreviewResult {
  bundle: { path: string; sizeMiB: number; modules: number };
  warnings: string[];
  errors: string[];
}

// test.run — run the test suite (unit, integration, determinism).
interface TestRunParams {
  classes: ('unit' | 'integration' | 'determinism' | 'conformance' | 'performance')[];
  filter?: string;  // test name pattern
  shard?: { index: number; total: number };  // for parallel runs
}
interface TestRunResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failures: { test: string; error: string; artifact?: ArtifactRef }[];
}

// simulation.runYears — run the simulation for N in-world years.
interface SimulationRunYearsParams {
  years: number;
  seed: string;
  /** Invariants to check at each checkpoint. */
  invariants?: SimulationInvariant[];
  /** A callback URL (webhook) for progress events. */
  progressWebhook?: string;
}
interface SimulationRunYearsResult {
  finalTick: bigint;
  finalHash: string;  // determinism hash
  invariantsChecked: number;
  invariantViolations: { tick: bigint; invariant: string; details: unknown }[];
  yearsSimulated: number;
  durationMs: number;
}

// benchmark.run — run a performance benchmark.
interface BenchmarkRunParams {
  scenario: string;  // e.g. 'village-morning'
  targetFps: number;  // e.g. 60
  durationSec: number;
  metrics: ('frameTime' | 'gpuTime' | 'cpuTime' | 'memory' | 'drawCalls')[];
}
interface BenchmarkRunResult {
  metrics: { name: string; avg: number; p95: number; p99: number; max: number }[];
  withinBudget: boolean;
  baselineDelta: { name: string; pct: number }[];  // vs. the last known good baseline
  trace: ProfilerTrace;
}

// visualRegression.run — run visual regression against a baseline.
interface VisualRegressionParams {
  scenario: string;
  checkpoints: number[];  // tick numbers at which to capture frames
  baseline: string;  // baseline ID
  threshold: number;  // 0..1, perceptual difference
}
interface VisualRegressionResult {
  checkpoints: { tick: number; diffPct: number; status: 'pass' | 'fail'; image: ArtifactRef }[];
  totalDiff: number;
  passed: boolean;
}

// playtest.launch — launch a VLM-driven playtest.
interface PlaytestLaunchParams {
  scenario: string;
  duration: number;  // seconds
  vlmModel: string;  // which VLM model to use
  objectives: string[];  // e.g. ['reach the village', 'talk to the elder']
  seed: string;
}
interface PlaytestLaunchResult {
  log: PlaytestLog;  // detailed in doc 45
  objectivesAchieved: string[];
  issuesFound: { severity: 'low' | 'med' | 'high'; description: string; frame?: ArtifactRef }[];
  vlmCost: { tokensIn: number; tokensOut: number; usd: number };
}
```

### 5.1 Execution and the transactional change process

Every Execution tool maps to a step in the transactional change process (doc 43 §6): `build.preview` → step 3, `test.run` → steps 5-6, `simulation.runYears` → step 11, `benchmark.run` → step 12, `visualRegression.run` → step 13, `playtest.launch` → step 14. The Architect role sequences these calls; the audit log records the step each call corresponds to.

### 5.2 Execution failure cases

- **Build fails.** `build.preview` returns `errors` non-empty. The AI loops back to Patch.
- **Test fails.** `test.run` returns `failed > 0`. The AI inspects the failure artifacts and loops back.
- **Determinism broken.** `simulation.runYears` returns `finalHash` that does not match the baseline. This is a hard fail; the transaction cannot advance.
- **Benchmark regression.** `benchmark.run` returns `withinBudget: false` or a `baselineDelta` worse than the threshold. The AI loops back to Implement.
- **Visual regression.** `visualRegression.run` flags a checkpoint as `fail`. The AI may either accept the regression (with reason) or loop back.
- **Playtest stuck.** `playtest.launch` reports the VLM could not achieve an objective. The AI inspects the playtest log to diagnose.
- **VLM cost exceeded.** `playtest.launch` has a budget; if exceeded, the playtest is cancelled and the partial log is returned.

---

## 6. Explanation tools (causal tracing)

Explanation tools are the AI's debugger. They trace effects back to causes: why does this NPC take this action? Why does this rule fire? Why does this triangle render this color? Explanation tools are the structural enforcement of "the AI understands what it is doing" — the AI cannot propose a fix it cannot explain.

```typescript
// world.whyDoesThisExist — explain why a world element exists.
interface WorldWhyDoesThisExistParams {
  targetId: string;  // entity ID, region ID, faction ID, etc.
}
interface WorldWhyDoesThisExistResult {
  targetId: string;
  provenance: ProvenanceChain[];  // see doc 49 §5
  /** The generator stage(s) that produced this. */
  generatorStages: string[];
  /** The seed streams that fed those stages. */
  seedStreams: string[];
  /** The definitions / templates that governed generation. */
  definitions: string[];
  /** Historical modifications, if any. */
  modifications: { tick: bigint; by: string; patch: JsonPatch }[];
}

// npc.explainDecision — explain why an NPC took a recent action.
interface NpcExplainDecisionParams {
  npcId: number;
  tick: bigint;  // the tick of the decision
  depth?: number;  // how many levels of reasoning to trace, default 5
}
interface NpcExplainDecisionResult {
  action: string;
  reasoning: { step: number; rule: string; inputs: unknown; output: unknown }[];
  alternativesConsidered: { action: string; score: number; rejectedBecause: string }[];
  /** The component states that fed the decision. */
  inputSnapshot: Record<string, unknown>;
}

// rule.trace — trace which rules fired for a given entity in a tick.
interface RuleTraceParams {
  entityId: number;
  tick: bigint;
  ruleNamespace?: string;  // filter by plugin
}
interface RuleTraceResult {
  fired: { ruleId: string; inputs: unknown; outputs: unknown; durationUs: number }[];
  evaluated: { ruleId: string; inputs: unknown; rejectedBecause: string }[];
}

// effect.trace — trace an effect (buff, debuff, damage) back to its source.
interface EffectTraceParams {
  effectId: string;  // the active effect instance
}
interface EffectTraceResult {
  effect: EffectDesc;
  source: { entityId: number; abilityId: string; tick: bigint };
  appliqueChain: { step: string; modifier: unknown }[];  // see doc 31
}

// generation.trace — trace how a world element was generated.
interface GenerationTraceParams {
  targetId: string;
}
interface GenerationTraceResult {
  stages: { stage: string; seed: string; output: unknown; durationMs: number }[];
  /** Re-runs the generation with the same seed; verifies the output matches. */
  deterministicReplay: { matched: boolean; hashBefore: string; hashAfter: string };
}

// physics.traceContact — trace why two bodies are in contact.
interface PhysicsTraceContactParams {
  bodyA: number;
  bodyB: number;
  tick: bigint;
}
interface PhysicsTraceContactResult {
  contactPoint: Vec3;
  normal: Vec3;
  impulse: number;
  /** The narrowphase algorithm that detected the contact. */
  algorithm: string;
  /** The solver iterations that resolved it. */
  solverIterations: number;
}

// renderer.tracePixel — trace why a pixel rendered the color it did.
interface RendererTracePixelParams {
  x: number; y: number;  // screen coordinates
  frame: number;  // which frame
}
interface RendererTracePixelResult {
  finalColor: [number, number, number, number];
  /** The render passes that contributed. */
  passes: { pass: string; contribution: [number, number, number, number] }[];
  /** The object ID at this pixel (from the object-ID buffer). */
  objectId: number;
  /** The triangle ID, if geometry. */
  triangleId?: number;
  /** The material and shader. */
  material?: { id: string; shader: string; uniforms: Record<string, unknown> };
  /** The lights that affected this pixel. */
  lights?: { id: string; contribution: [number, number, number] }[];
}
```

### 6.1 Explanation and the self-improvement loop

Explanation tools serve steps 3 (Diagnose) and 4 (Search) of the self-improvement loop (doc 43 §4). The AI cannot propose a fix without first explaining why the current behavior happens; the Proposal (doc 43 §4.1) must cite the Explanation tool's output as evidence.

### 6.2 Explanation failure cases

- **Tick too old.** `npc.explainDecision` for a tick older than the rolling event retention (default 1000 ticks) returns partial data with a warning.
- **Pixel outside frame.** `renderer.tracePixel` for coordinates outside the rendered viewport returns `NotFound`.
- **Generation non-deterministic.** `generation.trace` runs a replay; if the hash does not match, the result includes the mismatch and flags the generation as non-deterministic — a hard bug to chase.
- **Effect already expired.** `effect.trace` for an expired effect returns the last known state with a warning.

---

## 7. The tool proposal system

The AI is not limited to the tools the engine shipped with. The tool proposal system is the exit: the AI can propose new tools, with typed schemas, permissions, tests, runtime budgets, and security review. The proposal system is how the control plane grows.

```typescript
interface ToolProposal {
  proposalId: string;
  /** The proposed tool name, namespaced. */
  tool: string;
  description: string;
  category: ToolCategory;
  input: JsonSchema;
  output: JsonSchema;
  requiresPermissions: ToolPermission[];
  requiresAutonomy: AutonomyLevel;
  mutatesState: boolean;
  budget: ToolBudget;
  /** The implementation, as a plugin snippet. */
  implementation: {
    /** The plugin that will host this tool. */
    hostPlugin: PluginId;
    /** The source code, as an ES module string. */
    source: string;
    /** The entry function name (default: 'default'). */
    entry?: string;
  };
  /** Tests proving the tool works. */
  tests: ToolTestCase[];
  /** Why this tool is needed (references a CapabilityRequirement, doc 49). */
  justification: string;
  /** The autonomy level the AI requests for the proposal itself. */
  requestedAutonomy: AutonomyLevel;
}

interface ToolTestCase {
  name: string;
  input: unknown;
  expectedOutput: unknown;
  /** Optional: a setup that creates the precondition. */
  setup?: string;
  /** Optional: a teardown. */
  teardown?: string;
}
```

### 7.1 The proposal pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                TOOL PROPOSAL PIPELINE                                  │
│                                                                        │
│   AI drafts ──> static analysis ──> sandbox build ──> tests run        │
│                                                                        │
│   <──────────────────────────────────────────────  fail ──> revise    │
│                                                                        │
│   security review ──> performance review ──> human approval           │
│                                                                        │
│   <──────────────────────────────────────────────  fail ──> revise    │
│                                                                        │
│   tool registered ──> audit entry ──> [available for use]             │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Draft.** The AI (in the Implementer role) writes a `ToolProposal`. The proposal is a typed object; the Gateway validates its schema before accepting it.
2. **Static analysis.** The proposal's `implementation.source` is typechecked and linted. Schema violations, type errors, and lint failures loop back.
3. **Sandbox build.** The implementation is built as a plugin snippet in an isolated workspace. Build failures loop back.
4. **Tests run.** The proposal's `tests` are run against the built snippet. Test failures loop back.
5. **Security review.** The SecurityReviewer role (doc 48) inspects the implementation for: use of `eval`, network calls beyond declared origins, file system access beyond the workspace, mutation of state outside the declared `mutatesState` flag, attempts to read the player's save, attempts to spawn workers without permission. Findings are quoted first-person and signed.
6. **Performance review.** The PerformanceAuditor role runs the tool against a representative workload and verifies the `budget` is realistic. A tool that claims `maxWallClockMs: 100` but takes 800ms in practice is rejected.
7. **Human approval.** For tools at `requiresAutonomy >= Integrate`, a human operator approves. Below Integrate, the Architect role may approve (with Reviewer signature).
8. **Registration.** The tool is added to the registry; the audit log records the proposal, the reviews, and the approval.

### 7.2 Why the AI cannot self-approve its own tools

The doctrine says: "Exhibit reviewer voices; do not self-certify." A tool is a new way to mutate the engine. The AI that proposes a tool benefits from its approval; it cannot be the same AI that approves. The Architect role (which does not write code) signs the approval, on the basis of the SecurityReviewer's and PerformanceAuditor's signed findings.

### 7.3 Tool deprecation

Tools can be deprecated. A deprecated tool is marked in the registry; the Gateway refuses new calls but allows in-flight ones to complete. Deprecation requires the same approval as registration. The audit log records who deprecated, why, and what the migration path is (the replacement tool, if any).

---

## 8. Resource budgets

Every tool has a budget. The Gateway enforces budgets at three levels: per-call, per-session, and per-day. A session that exceeds its per-session budget is rate-limited; a session that exceeds its per-day budget is suspended until the next day (or until a human grants an extension).

```typescript
interface ResourceBudget {
  /** Per-call: enforced by the tool's `budget` field. */
  perCall: ToolBudget;
  /** Per-session: the sum of all calls in a session. */
  perSession: {
    maxWallClockMs: number;     // default 1 hour
    maxCpuMs: number;           // default 30 min
    maxMemoryMiB: number;       // default 4 GiB
    maxToolCalls: number;       // default 10_000
    maxVlmTokens: number;       // default 10M input + 1M output
    maxAsyncJobs: number;       // default 8 concurrent
  };
  /** Per-day: the sum of all sessions in a calendar day. */
  perDay: {
    maxWallClockMs: number;     // default 8 hours
    maxVlmCostUsd: number;      // default $50
  };
}
```

### 8.1 Why budgets are first-class

The AI does not get tired, bored, or stop to think about cost. Without budgets, an AI in a tight loop (a stuck playtest, a benchmark that keeps regressing) can spend unbounded compute, VLM tokens, and money. Budgets make the cost visible to the AI (which can escalate for more) and to the operator (who can see the burn rate). The doctrine says: "State the calendar and the budget." Budgets are the budget.

### 8.2 Budget failure cases

- **Per-call exceeded.** The tool is cancelled; `BudgetExceeded` is returned with the actual usage.
- **Per-session exceeded.** The session is rate-limited; new calls return `BudgetExceeded` until the session is renewed (which requires Architect approval).
- **Per-day exceeded.** The session is suspended; new sessions for the same principal are refused until the next day or a human grants an extension.
- **Async job limit.** New async jobs return `Conflict` with the count of in-flight jobs.

---

## 9. Failure cases (protocol-level)

| Failure | Detection | Response |
|---|---|---|
| Tool not in registry | Gateway registry lookup | `ToolNotFound` |
| Input does not match schema | JSON Schema validation at Gateway | `SchemaInvalid` with the failing path |
| Permission missing | Capability token check | `PermissionDenied` with the missing permission |
| Autonomy insufficient | `assertedAutonomy` < `requiresAutonomy` | `AutonomyExceeded`; AI must escalate |
| Deadline exceeded | Watchdog at `deadlineMs` | `DeadlineExceeded`; tool cancelled |
| Async handle invalid | Handle lookup | `NotFound` |
| Async handle cancelled by another caller | Handle state | `Cancelled` with the canceller's identity |
| Gateway desync from engine | Session heartbeat | `SessionUnknown`; AI re-authenticates |
| Tool throws uncaught exception | Tool runtime | `InternalError` with a stack trace (in dev) or a sanitized error (in prod) |
| Tool returns invalid output | Output schema validation | `InternalError` with `kind: SchemaInvalid` and the failing path |
| MCP adapter fails to translate | Adapter sanity check | Adapter returns `InternalError`; the AI falls back to JSON-RPC |

---

## 10. Rejected alternatives

### 10.1 "Free-form function calls"

The first design: the AI calls any exported engine function by name, with any arguments. Rejected because (a) there is no schema to validate against, so the AI can pass nonsense and the engine crashes; (b) there is no audit story — a free function call has no before/after, no diff, no budget; (c) there is no permission story — the engine's internal functions are not permissioned. The tool registry is the structural fix: every callable is a tool, every tool has a schema, a permission, a budget, and an audit record.

### 10.2 "GraphQL for inspection, JSON-RPC for mutation"

The second design: split the protocol by category, use GraphQL for Inspection (because of field selection) and JSON-RPC for everything else. Rejected because (a) two protocols is more complex than one with no real benefit (the AI rarely needs field selection — it wants whole tool results); (b) the Gateway now has to translate two protocols; (c) the audit story differs between the two. One protocol, four transports, is simpler.

### 10.3 "Tools are plugins, not registry entries"

The third design: every tool is itself a plugin, with its own manifest and lifecycle. Rejected because (a) it conflates two scales — a plugin is a major unit (the renderer, the physics solver); a tool is a minor unit (`terrain.inspectChunk`); (b) the lifecycle overhead (manifest validation, dependency resolution, init/destroy) is too heavy for a tool; (c) tools are registered by plugins during `init`, which is the right granularity. Tools are entries in a registry owned by plugins.

### 10.4 "The AI can call tools without an audit record (for performance)"

The fourth design: a "fast path" that skips the audit log for Inspection tools, on the theory that read-only calls do not need audit. Rejected because (a) the audit log is how the operator understands what the AI did, including what it read — a malicious AI reading the player's save and exfiltrating it through a side channel is exactly the threat the audit log detects; (b) the performance cost of audit is small (a record append, async); (c) the doctrine (AGENTS.md Part 3) says: "Exhibit reviewer voices; do not self-certify." An unaudited call path is a self-certified call path. Every call is audited.

### 10.5 "Tools can be added without security review"

The fifth design: a tool proposal with passing tests is auto-registered. Rejected because tests prove the tool does what it claims, not that it does not also do something else. A tool that reads the player's save and posts it to an external URL would pass any functional test. The SecurityReviewer role exists to look for the things the tests do not test.

### 10.6 "REST is the primary transport"

The sixth design: REST over HTTP is primary; WebSocket is the fallback. Rejected because (a) REST cannot push progress events for long-running tools without bolting on Server-Sent Events or long-polling; (b) REST has higher per-call overhead (TCP+TLS handshake per request, or HTTP/2 multiplexing which is not universally supported); (c) the AI's access pattern is high-volume bidirectional, which is WebSocket's sweet spot. REST is the fallback for human curl-ability and for AI frameworks that do not speak WebSocket.

---

## 11. What this document enables

The protocol in this document enables the AI to:

- **Discover** what it can call (`engine.describe`).
- **Inspect** any engine subsystem (section 3).
- **Edit** engine content in a controlled, audited, reversible way (section 4).
- **Execute** builds, tests, simulations, benchmarks, playtests (section 5).
- **Explain** why the engine behaves the way it does (section 6).
- **Propose** new tools when the existing set is insufficient (section 7).

Each capability is paired with a gate: schemas, permissions, autonomy, budgets, audit, security review. The doctrine (AGENTS.md Part 3) says: "Build the engine, not just the brake." The tool categories are the engine; the gates are the brake; both are present, both are necessary, and neither is allowed to grow without the other.
