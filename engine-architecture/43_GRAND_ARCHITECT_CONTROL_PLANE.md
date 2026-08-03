# 43 — Grand Architect Control Plane

**Status:** Architecture. The control plane through which an authorized AI inspects, understands, tests, modifies, and extends every engine subsystem.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `02_KERNEL_LIFECYCLE` (PluginHost), `03_PLUGIN_SDK_CAPABILITY_SYSTEM` (capability registry), `06_DETERMINISM_SEEDS_REPLAY` (replay contract), `10_EVENTS_COMMANDS_QUERIES_TRANSACTIONS` (event bus), `35_MODDING_UNTRUSTED_CONTENT` (sandbox model), `41_SECURITY_FAILURE_RECOVERY` (security principals), `42_IMPLEMENTATION_DEPENDENCY_ROADMAP` (phased exit criteria)
**Read with:** `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL`, `45_BROWSER_VLM_OBSERVATION_VISUAL_QA`, `46_AUTONOMOUS_CHANGE_VALIDATION_PROMOTION`, `47_RESEARCH_GITHUB_DEPENDENCY_ACQUISITION`, `48_AI_PERMISSIONS_SECURITY_AUDIT`, `49_MACHINE_READABLE_CAPABILITY_DECISION_GRAPH`

---

## 0. What this document is

The engine is a plugin host (doc 02, doc 03). Every system — renderer, physics, NPC simulator, ecology, economy, history, cultivation — is a plugin. A human designer can inspect and tune any of them through the editor suite (doc 36). The **Grand Architect Control Plane** is the equivalent surface for an authorized AI: a control plane that lets an AI inspect, understand, test, modify, and extend every subsystem with the same degree of access as a senior engine engineer, but under a security boundary and an autonomy model that protects the player's save, the determinism contract, and the project's integrity.

The doctrine (AGENTS.md Part 3) says: "Build the engine, not just the brake." The control plane is the engine. It is not a watchdog over an AI that is otherwise locked out; it is the surface through which the AI does its work. The brake (security, audit, autonomy levels, transactional rollback) is paired with the engine (inspection, editing, execution, explanation) — each gate has a corresponding capability, and each capability has a corresponding gate.

The doctrine also says: "Do not confuse the apparatus with the work." The control plane is apparatus. Its purpose is to let the AI produce **experience**: a working vertical slice, a feel that lands, a moment a player remembers. Every page of control-plane specification in this document and its companion docs (44-49) is justified by the experience it enables, not by the governance it adds.

This document defines the overall architecture. The companion documents drill into specifics: the tool/protocol (44), the visual observation channel (45), the change validation/promotion pipeline (46), the research and dependency acquisition broker (47), the security model and audit trail (48), and the machine-readable capability and decision graph (49).

---

## 1. The three communication channels

The control plane is not one channel; it is three. Each channel is optimized for a different communication pattern. Confusing the channels — using the command channel for events, or the browser channel for state mutations — produces fragile integrations and lost messages. The three channels are:

```
┌────────────────────────────────────────────────────────────────────────┐
│                  GRAND ARCHITECT CONTROL PLANE                          │
│                                                                        │
│   ┌──────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │
│   │   WEBHOOK    │   │  COMMAND CHANNEL │   │   BROWSER / VLM      │  │
│   │  (async)     │   │  (live, ordered) │   │   (observation)      │  │
│   └──────┬───────┘   └────────┬─────────┘   └──────────┬───────────┘  │
│          │                    │                        │              │
│          │  events the        │  commands the AI       │  pixels and  │
│          │  engine pushes     │  issues; results it    │  buffers the │
│          │  to the AI when    │  receives synchronously│  AI inspects │
│          │  something happens │  or as task results    │  visually    │
│          │                    │                        │              │
│          v                    v                        v              │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                   ARCHITECT GATEWAY                            │  │
│   │      (the security boundary; see section 3)                    │  │
│   └────────────────────────────────────────────────────────────────┘  │
│                              │                                         │
│                              v                                         │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                   ENGINE PLUGIN HOST                            │  │
│   │   (kernel, plugins, simulation, renderer, persistence)         │  │
│   └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 The webhook channel (async events)

The webhook channel carries **engine-to-AI** notifications. When something the AI should know about happens — a generation completed, a determinism checkpoint mismatched, a test failed, a build finished, a new save was written, a performance threshold was breached — the engine POSTs a signed event to a configured webhook URL. The AI reacts on its own schedule.

```typescript
interface WebhookEnvelope {
  /** The event type, namespaced: 'engine.checkpoint.Mismatch', 'build.Completed'. */
  type: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** The engine session that emitted this event. */
  sessionId: string;
  /** The engine tick at which the event was emitted, if applicable. */
  tick?: bigint;
  /** The event payload, CBOR-serializable. */
  payload: unknown;
  /** HMAC-SHA256 over (type, timestamp, sessionId, payload) using the shared webhook secret. */
  signature: string;
  /** A monotonic sequence number per session, for ordering and dedup. */
  seq: number;
}
```

The webhook is **fire-and-forget from the engine's perspective**. The engine does not block on the AI acknowledging the event. If the AI is offline, events queue up to a configured retention (default 24h, max 10k events) and are drained when the AI reconnects. The engine does not retry indefinitely — beyond the retention window, dropped events are dropped, and the AI is expected to reconcile by re-querying state through the command channel.

The webhook channel is **read-only for the AI**. The AI cannot mutate engine state through it. It can only react.

### 1.2 The persistent command channel (live control)

The command channel is the AI's hands. It is a persistent, ordered, request-response channel over WebSocket (primary) or JSON-RPC over HTTP (fallback). Every tool call the AI makes — inspect a chunk, patch a definition, run a test, launch a playtest — flows through this channel. The channel is **persistent** because some operations (long simulations, year-long playthroughs, multi-hour playtests) take longer than an HTTP request can reasonably stay open, and the AI needs to be able to issue follow-up commands, poll for results, and cancel in-flight work.

```typescript
interface CommandRequest {
  /** A ULID, used to match the response. */
  requestId: string;
  /** The session this command belongs to. */
  sessionId: string;
  /** The tool name, namespaced: 'engine.describe', 'definition.patch'. */
  tool: string;
  /** The arguments object, validated against the tool's input schema. */
  args: Record<string, unknown>;
  /** The autonomy level the AI is asserting for this call (see section 5). */
  assertedAutonomy: AutonomyLevel;
  /** A capability token proving the AI is permitted to call this tool at this autonomy. */
  capabilityToken: string;
  /** A deadline (ms from issue). The engine refuses to start work past the deadline. */
  deadlineMs: number;
}

interface CommandResponse {
  requestId: string;
  status: 'ok' | 'error' | 'pending' | 'cancelled';
  /** Present when status is 'ok' or 'error'. */
  result?: unknown;
  error?: { code: string; message: string; details?: unknown };
  /** For long-running operations, a handle the AI can poll or cancel. */
  asyncHandle?: string;
  /** The audit record for this call (see doc 48). */
  audit: AuditRecord;
}
```

The channel's ordering guarantees: commands from a single session are processed in issue order. Commands from different sessions are processed concurrently. The engine may rate-limit a session that exceeds its declared budget (see doc 44 §6).

The command channel is **the only channel through which the AI mutates engine state**. The webhook channel is read-only; the browser channel can drive input (for playtests) but cannot directly mutate simulation state — input it injects becomes a command in the input log, processed through the normal command path.

### 1.3 The browser/VLM channel (visual observation)

The browser/VLM channel is the AI's eyes. It carries **synchronized multimodal inspection packages** — RGB frames, depth buffers, object-ID buffers, surface normals, motion vectors, collision wireframes, navigation overlays, voxel/density visualizations, lighting buffers, entity labels, performance heat maps, scene graph fragments, physics contact lists, selected-object component data, and current engine logs — that let the AI see what the engine is rendering and why. The browser channel is detailed in doc 45.

The browser channel is **bidirectional but asymmetric**: the AI receives rich visual telemetry (high bandwidth, often) and can issue low-rate input events (mouse moves, key presses, click targets) to drive a playtest. But the AI cannot use the browser channel to mutate engine state directly — input it injects becomes a command, processed through the command channel's audit path.

### 1.4 Why three channels, not one

A single channel — "everything is a tool call" — was the obvious first design. It was rejected for three reasons:

1. **Bandwidth and polling.** Visual telemetry is high-bandwidth and stateful. Polling it through a request-response channel wastes bandwidth and adds latency. A dedicated observation channel lets the engine push frames when the scene changes, not when the AI asks.
2. **Liveness.** Engine events (a checkpoint mismatch, a build failure) need to reach the AI even when the AI is not actively polling. A webhook channel is the standard pattern for this; pretending a request-response channel is also an event channel produces contortions (long-poll, server-sent events bolted on).
3. **Separation of concerns.** The audit story for a state mutation (every call recorded, every change diffed, every approval tracked) is different from the audit story for a frame render (sampled, summarized, retained briefly). One channel with one audit model would over-audit observation and under-audit control.

---

## 2. The Architect Gateway

The Architect Gateway is the single chokepoint through which all three channels pass. It is the security boundary between the AI and the engine. The engine's PluginHost never accepts a connection from an AI directly; it accepts connections only from the Gateway, which has authenticated the AI, verified its capability tokens, enforced its autonomy level, and logged the call.

```
┌─────────────┐         ┌────────────────────────────┐         ┌──────────────┐
│             │  web-   │                            │  plain   │              │
│   AI agent  │  hook   │       ARCHITECT GATEWAY    │  WSS /   │   PluginHost │
│  (external) │────────>│                            │  JSON-   │   (engine)   │
│             │  WSS /  │  • TLS termination         │  RPC     │              │
│             │  JSON-  │  • session authentication  │-------->│              │
│             │  RPC    │  • capability token check  │         │              │
│             │         │  • autonomy level enforce  │         │              │
│             │         │  • rate limiting           │         │              │
│             │         │  • audit log write         │         │              │
│             │         │  • approval routing        │         │              │
│             │         │  • tool schema validation  │         │              │
│             │         │  • webhook signing         │         │              │
│             │         │  • VLM session multiplex   │         │              │
└─────────────┘         └────────────────────────────┘         └──────────────┘
```

```typescript
interface ArchitectGateway {
  /** Authenticate an AI principal; return a session. */
  authenticate(credentials: AICredentials): Promise<ArchitectSession>;
  /** Validate a command request against the session's capabilities and autonomy. */
  authorize(req: CommandRequest, session: ArchitectSession): AuthorizationResult;
  /** Forward an authorized command to the engine; return the response. */
  forward(req: CommandRequest, session: ArchitectSession): Promise<CommandResponse>;
  /** Emit a webhook to the AI's registered endpoint. */
  emitWebhook(envelope: WebhookEnvelope): Promise<void>;
  /** Open a VLM observation stream (see doc 45). */
  openVlmStream(session: ArchitectSession, spec: VlmStreamSpec): Promise<VlmStream>;
  /** Look up the audit trail for a session, tool, or entity. */
  queryAudit(filter: AuditFilter): Promise<AuditRecord[]>;
}

interface ArchitectSession {
  sessionId: string;
  principalId: string;             // which AI identity (see section 4)
  role: ArchitectRole;
  autonomy: AutonomyLevel;          // current max autonomy (see section 5)
  capabilities: string[];           // tool IDs this session may call
  issuedAt: string;
  expiresAt: string;                // short-lived (default 15 min)
  renewalToken: string;             // to extend before expiry
}
```

The Gateway is **stateless across restarts** except for its audit log (durable) and its session cache (rebuildable from the audit log). It does not hold engine state. It can be restarted without losing the engine; the AI loses its session, reconnects, and resumes.

The Gateway runs in a **separate process** from the engine, on the same host (in dev) or a sidecar (in production). It is the only network endpoint the AI is permitted to reach. The engine's PluginHost listens on a Unix domain socket (or a localhost-only TCP port) that the Gateway proxies to.

### 2.1 Gateway failure modes

- **Gateway crash.** The AI's session is lost; the engine continues running. The AI reconnects, re-authenticates, and resumes. In-flight async commands are orphaned; the engine cancels them after a heartbeat timeout (default 30s) and reports cancellation in the audit log.
- **Gateway desync from engine.** If the Gateway's session cache diverges from the engine's view (e.g., the engine evicted a session for memory pressure), the Gateway's next forward fails with `SessionUnknown`. The AI re-authenticates. The audit log reconciles.
- **Gateway compromise.** The Gateway holds the webhook secret and the session signing key, but not the player's save (that lives in the engine's persistence layer, encrypted at rest with a key the Gateway never sees). A compromised Gateway can issue authorized commands but cannot read saves directly. The audit log detects anomalous command patterns. See doc 48 §5 for incident response.
- **Gateway replay attack.** A captured command cannot be replayed because each command carries a `capabilityToken` bound to the session and the `assertedAutonomy`, and the token is single-use for state-mutating tools.

---

## 3. The architect roles

The control plane is not one AI; it is a roster of specialized roles. Each role has its own capability set, its own autonomy defaults, and its own audit profile. The same underlying AI model may serve multiple roles in a small project; in a larger one, different model instances (or different providers) fill different roles. The role is **asserted at session establishment** and **enforced by the Gateway** — a session scoped to the Reviewer role cannot call Implementer tools, even with a stolen token.

```typescript
type ArchitectRole =
  | 'Architect'              // the coordinator; routes work, sets autonomy
  | 'Researcher'             // doc/paper/GitHub research; see doc 47
  | 'Implementer'            // writes definitions, templates, code; patches plugins
  | 'Reviewer'               // independent critique; see section 6
  | 'VlmPlaytester'          // browser/VLM observation and playtesting; see doc 45
  | 'PerformanceAuditor'     // benchmarks, frame timing, memory budgets
  | 'SimulationAuditor'      // determinism, replay, save/load correctness
  | 'SecurityReviewer';      // permissions, dependencies, attack surface; see doc 48

interface RoleProfile {
  role: ArchitectRole;
  /** Tools this role may call (subset of the tool registry). */
  allowedTools: string[];
  /** Default autonomy ceiling — the role cannot assert above this without escalation. */
  autonomyCeiling: AutonomyLevel;
  /** Whether this role may initiate approval requests to the human operator. */
  mayEscalate: boolean;
  /** Whether this role's outputs require independent review before promotion. */
  requiresReview: boolean;
}
```

| Role | Allowed tool families | Autonomy ceiling | May escalate | Requires review |
|---|---|---|---|---|
| Architect | All (coordination only — does not write code) | Branch | Yes | No (it coordinates reviews) |
| Researcher | Inspection, Research (doc 47) | Sandbox | Yes | Yes |
| Implementer | Inspection, Controlled Editing, Execution | Branch | Yes | Yes |
| Reviewer | Inspection, Explanation, Critique | Preview | No | N/A |
| VlmPlaytester | Inspection, VLM tools (doc 45), Playtest | Preview | Yes | Yes |
| PerformanceAuditor | Inspection, profiler.capture, benchmark.run | Preview | No | Yes |
| SimulationAuditor | Inspection, simulation.runYears, replay tools | Preview | No | Yes |
| SecurityReviewer | Inspection, audit queries, dependency inspect | Preview | Yes | Yes |

The separation is **enforced, not advisory**. The doctrine (AGENTS.md Part 3) says: "Exhibit reviewer voices; do not self-certify." The Architect role cannot approve its own work; the Implementer role cannot ship without a Reviewer's signature. The role boundary is the structural enforcement of that doctrine.

### 3.1 The Architect role in particular

The Architect is the coordinator. It does not write code; it routes work, sets the autonomy level for a task, picks which role handles which subtask, and presents the final result to the human operator (or commits autonomously if the autonomy level permits). The Architect is the only role that can change another session's autonomy level, and only via a documented escalation path (section 5).

### 3.2 Why eight roles

The doctrine warns against governance apparatus that grows while work does not. Eight roles is the minimum that satisfies "do not self-certify" without producing a meeting room: each role either produces work (Implementer, Researcher, VlmPlaytester) or audits work someone else produced (Reviewer, PerformanceAuditor, SimulationAuditor, SecurityReviewer), with the Architect as the non-writing coordinator. Fewer roles collapse the producer/auditor separation; more roles add coordination cost without adding new perspective.

---

## 4. The self-improvement loop (16 steps)

The control plane's purpose is to let the AI improve the engine. "Improve" means: identify a gap, propose a change, implement it, validate it, and commit or roll back. The loop below is the canonical 16-step sequence. Not every step is taken on every change; some steps are no-ops for trivial work. But the loop is the contract — the AI may not skip a step silently, and the audit log records which steps were taken, which were skipped (and why), and which produced evidence.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  THE SELF-IMPROVEMENT LOOP (16 STEPS)                    │
│                                                                         │
│   1. Observe        — read engine state, watch a frame, query a system   │
│   2. Compare        — diff current state against desired capability      │
│   3. Diagnose       — identify the root cause of the gap                 │
│   4. Search         — query the World Oracle (doc 49) for prior art      │
│   5. Determine      — decide: fix, extend, or replace?                   │
│   6. Research       — external sources, candidate deps (doc 47)          │
│   7. Propose        — write the change as a Proposal (typed)             │
│   8. Evaluate       — Reviewer + auditors review the Proposal            │
│   9. Implement      — produce the patch in an isolated workspace         │
│  10. Test           — unit + integration (doc 46)                        │
│  11. Simulate       — run years of simulation; check invariants          │
│  12. Benchmark      — frame timing, memory, determinism hash             │
│  13. Playtest       — VLM playtester plays the affected scene            │
│  14. Critique       — independent Reviewer tries to falsify              │
│  15. Present        — semantic diff + evidence to human or Architect     │
│  16. Commit/Rollback — promote to release, or revert and record why      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1 The 16 steps, in detail

```typescript
type SelfImprovementStep =
  | 'Observe'        | 'Compare'     | 'Diagnose'    | 'Search'
  | 'Determine'      | 'Research'    | 'Propose'     | 'Evaluate'
  | 'Implement'      | 'Test'        | 'Simulate'    | 'Benchmark'
  | 'Playtest'       | 'Critique'    | 'Present'     | 'CommitOrRollback';

interface StepRecord {
  step: SelfImprovementStep;
  /** Which role executed this step. */
  role: ArchitectRole;
  /** Timestamps. */
  startedAt: string;
  completedAt: string;
  /** The autonomy level asserted for this step. */
  autonomy: AutonomyLevel;
  /** Tool calls made during this step (references into the audit log). */
  toolCalls: string[];
  /** Artifacts produced (proposal, patch, benchmark report, critique, etc.). */
  artifacts: ArtifactRef[];
  /** The outcome. */
  outcome: 'proceed' | 'loop-back' | 'abort';
  /** If loop-back, which step to return to and why. */
  loopBackTo?: SelfImprovementStep;
  loopBackReason?: string;
}
```

**1. Observe.** The AI inspects engine state through Inspection tools (doc 44 §3). It reads a chunk, queries an entity, captures a frame. The output is a structured observation, not free text.

**2. Compare.** The AI diffs the observed state against the **desired capability** (doc 49 §1 — the `CapabilityRequirement` interface). The output is a gap statement: "the renderer cannot currently do X; here is what X requires."

**3. Diagnose.** The AI identifies the root cause. Not "the frame is slow" but "the depth prepass is disabled, causing overdraw in the foliage system." Diagnosis uses Explanation tools (doc 44 §5) to trace effects back to causes.

**4. Search.** The AI queries the World Oracle (doc 49 §4) for prior art — has this gap been addressed in an architectural decision? In a plugin? In a rejected alternative? Search prevents re-litigating settled decisions.

**5. Determine.** The AI decides the strategy: fix in place (patch the existing system), extend (add a new system), or replace (deprecate and rewrite). This decision is recorded as a `Determination` artifact and becomes input to the architectural decision ledger (doc 49 §3).

**6. Research.** If the fix involves external knowledge — an algorithm, a library, a paper — the Researcher role runs the research broker (doc 47). External candidates are inspected, ranked, and either adopted, adapted, ported, or rejected with reason.

**7. Propose.** The Implementer writes a `Proposal` — a typed document specifying what will change, what will not change, what the acceptance tests are, and what the rollback plan is.

```typescript
interface Proposal {
  proposalId: string;
  title: string;
  /** The gap this proposal addresses (references a CapabilityRequirement). */
  addressesGap: string;
  /** What will change, in human-readable terms. */
  summary: string;
  /** The affected systems (plugin IDs, capability IDs, definition IDs). */
  affectedSystems: string[];
  /** What explicitly will NOT change. */
  nonGoals: string[];
  /** Acceptance tests — the proposal is not done until these pass. */
  acceptanceTests: AcceptanceTest[];
  /** The rollback plan. */
  rollback: RollbackPlan;
  /** The autonomy level the AI requests for execution. */
  requestedAutonomy: AutonomyLevel;
  /** Research artifacts, if Research was run. */
  research?: ResearchCandidate[];
  /** Estimated work, in role-hours. */
  estimatedEffort: { role: ArchitectRole; hours: number }[];
}
```

**8. Evaluate.** The Reviewer role (and, depending on the affected systems, the Performance, Simulation, and Security auditors) reviews the Proposal. They may approve, request changes, or reject. The evaluation is a first-person signed record, not a checklist (per the doctrine: "If you ran a review, sign it").

**9. Implement.** The Implementer produces the patch in an isolated workspace (doc 46 §1). No code reaches the main branch until validation completes.

**10. Test.** Unit and integration tests run (doc 46 §4). Failures loop back to Implement.

**11. Simulate.** The Simulation auditor runs `simulation.runYears` against the patched world. Invariants are checked. Determinism is verified by checkpoint hash. Failures loop back to Diagnose.

**12. Benchmark.** The Performance auditor runs `benchmark.run`. Frame timing, memory, and the determinism hash are compared against baseline. Regressions loop back to Implement.

**13. Playtest.** The VLM playtester plays the affected scene (doc 45). It looks for visual artifacts, broken interactions, missing feedback. Failures loop back to Implement or Diagnose.

**14. Critique.** The Reviewer tries to **disprove** the proposal's success — the falsification requirement (doc 46 §3). The critique is signed and quoted in the final presentation.

**15. Present.** The Architect composes the semantic diff (doc 46 §2) and the evidence (test results, benchmark report, playtest log, critique) into a presentation. The presentation goes to a human operator (for changes above the AI's autonomy) or to the commit step (for changes within autonomy).

**16. Commit or Rollback.** The change is committed (promoted through the approval pipeline of doc 46) or rolled back (the workspace is discarded, the audit record retains the attempt, the architectural decision ledger records what was learned).

### 4.2 Skipping steps

A step may be skipped only if:

- The step's preconditions are not met (e.g., Research is skipped if the fix is internal).
- The skip is recorded in the audit log with a reason.
- The skip does not violate a role's `requiresReview` flag.

The Architect role signs the skip. Skipping Test, Simulate, Benchmark, or Critique for a state-mutating change is **forbidden**; the audit log flags the attempt and the Gateway refuses to commit.

---

## 5. Risk-based autonomy levels

The AI does not have a single "trust level." It has a per-task, per-session autonomy level that scales with the risk of the change. Low-risk observations are autonomous; high-risk mutations require approval. The seven levels are linearly ordered; each level permits the previous level's actions plus new ones.

```typescript
type AutonomyLevel =
  | 'Observe'      // 1 — read anything; mutate nothing
  | 'Diagnose'     // 2 — run traces, explain, propose
  | 'Sandbox'      // 3 — modify isolated workspace; cannot touch main
  | 'Preview'      // 4 — run the workspace in a preview build; player cannot see
  | 'Branch'       // 5 — push the workspace to a branch; CI runs
  | 'Integrate'    // 6 — merge the branch to main; main is updated
  | 'Release';     // 7 — ship to players; save migration may run
```

| Level | What the AI may do | What it still cannot do |
|---|---|---|
| Observe | Inspect any system, capture frames, query state | Mutate anything; propose without sign-off |
| Diagnose | Run explanation traces, write Proposals, search the Oracle | Mutate state; open a workspace |
| Sandbox | Open an isolated workspace; patch definitions, templates, code in the workspace | Run the workspace outside the sandbox; push to a branch |
| Preview | Run the workspace as a preview build; the VLM playtester may play it | Push to a shared branch; integrate to main |
| Branch | Push the workspace to a version-controlled branch; CI runs | Merge to main; release |
| Integrate | Merge the branch to main (with a Reviewer's signature) | Release to players; run save migrations |
| Release | Promote a build to players; run save migrations (with a human's signature for now) | Change the architect system itself; rewrite migrations |

### 5.1 The autonomy escalation path

If the AI needs more autonomy than its current session permits, it escalates:

```typescript
interface EscalationRequest {
  /** The autonomy level requested. */
  requestedAutonomy: AutonomyLevel;
  /** The task that requires the escalation. */
  taskDescription: string;
  /** The Proposal that justifies the escalation. */
  proposalRef: string;
  /** The risk assessment (what could go wrong, what's the mitigation). */
  riskAssessment: RiskAssessment;
  /** Who must approve (computed from the level: 'human' for Release, 'architect' otherwise). */
  approver: 'human' | 'architect';
}

interface RiskAssessment {
  /** What could go wrong if the AI proceeds at this autonomy. */
  failureModes: { mode: string; severity: 'low' | 'med' | 'high' | 'critical'; mitigation: string }[];
  /** What the AI has already done to reduce the risk. */
  mitigationsApplied: string[];
  /** The blast radius — what systems / saves / players are affected if it goes wrong. */
  blastRadius: string[];
  /** The rollback cost — how hard is it to undo. */
  rollbackCost: 'trivial' | 'minutes' | 'hours' | 'days' | 'irreversible';
}
```

The Gateway routes the escalation to the approver: the Architect role for levels up to Integrate, a human operator for Release (and for any change touching the architect system itself, save migrations, or permission grants — see doc 48 §3). The approver's decision is recorded in the audit log with the reason.

### 5.2 Why seven levels, not three

The doctrine (AGENTS.md Part 3) warns against binary gates. A three-level model ("observe / sandbox / release") either under-trusts the AI (every interesting change needs release-level approval) or over-trusts it (release becomes the default for anything that touches main). Seven levels let the AI make progress at the lowest level that suffices: a Sandbox-level fix that does not need preview does not need preview-level approval; a Preview-level playtest that does not need a branch does not need branch-level approval. Each level is an exit, not a gate (per the doctrine).

---

## 6. The transactional change process

A change is not "applied." It is **transacted**. The transactional change process is the sequence of validation steps every state-mutating change must pass before it is committed. The process is the structural enforcement of the doctrine's "Exhibit reviewer voices; do not self-certify": each step is a checkpoint at which the change can fail and be rolled back, with no partial application.

```
┌────────────────────────────────────────────────────────────────────────┐
│             THE TRANSACTIONAL CHANGE PROCESS                            │
│                                                                        │
│   Snapshot ──> Patch ──> Build ──> Static Validation ──> Unit Tests    │
│                                                                  │      │
│   <─────────────────────────────────────────────────────────────  │  rollback
│                                                                  v      │
│   Integration Tests ──> Deterministic Replay ──> Performance Bench  │
│                                                                        │
│   <──────────────────────────────────────────────────────────────  rollback
│                                                                  v      │
│   Visual Regression ──> Browser/VLM Playtest ──> Independent Critique  │
│                                                                        │
│   <──────────────────────────────────────────────────────────────  rollback
│                                                                  v      │
│   Semantic Diff ──> Approval or Rollback ──> [committed or reverted]  │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 The transactional interface

```typescript
interface ChangeTransaction {
  transactionId: string;
  /** The Proposal this transaction implements. */
  proposalRef: string;
  /** The autonomy level asserted. */
  autonomy: AutonomyLevel;
  /** The snapshot the transaction started from (for rollback). */
  baselineSnapshot: SnapshotRef;
  /** The current step. */
  currentStep: TransactionalStep;
  /** The full step history, with results. */
  steps: TransactionalStepRecord[];
  /** The final outcome, when the transaction terminates. */
  outcome?: 'committed' | 'rolled-back' | 'aborted';
}

type TransactionalStep =
  | 'Snapshot'              // 1. capture the baseline (workspace + state + assets)
  | 'Patch'                 // 2. apply the proposed edits
  | 'Build'                 // 3. compile / bundle
  | 'StaticValidation'      // 4. typecheck, lint, schema validation
  | 'UnitTests'             // 5. unit tests
  | 'IntegrationTests'      // 6. integration tests
  | 'DeterministicReplay'   // 7. replay a known-good input log; hash must match
  | 'PerformanceBenchmarks' // 8. frame timing, memory, determinism hash
  | 'VisualRegression'      // 9. compare frames against baseline
  | 'BrowserVlmPlaytest'    // 10. VLM playtester plays the scene
  | 'IndependentCritique'   // 11. Reviewer tries to falsify
  | 'SemanticDiff'          // 12. produce the human-readable diff
  | 'ApprovalOrRollback';   // 13. commit or revert

interface TransactionalStepRecord {
  step: TransactionalStep;
  startedAt: string;
  completedAt: string;
  status: 'pass' | 'fail' | 'warn' | 'skipped';
  /** The artifact this step produced (test report, benchmark, diff, etc.). */
  artifact?: ArtifactRef;
  /** If the step failed, the failure details. */
  failure?: { code: string; message: string; details?: unknown };
  /** Whether the transaction rolled back as a result. */
  rolledBack?: boolean;
}
```

### 6.2 What each step proves

1. **Snapshot.** The baseline. A full capture of the workspace (source tree, build cache, assets), the world state (seed, tick, checkpoint, command log), and the engine fingerprint. Without a snapshot, rollback is impossible.
2. **Patch.** The proposed edits applied. The patch is a typed object — `definition.patch`, `template.create`, `plugin.scaffold` (doc 44 §4) — not free-form text. The Gateway records the patch in the audit log.
3. **Build.** The workspace compiles. A build failure loops back to Patch.
4. **Static Validation.** TypeScript typecheck, ESLint, JSON schema validation against the plugin manifest and definition schemas. Static validation catches whole classes of bugs without running the engine.
5. **Unit Tests.** Each plugin's unit-test class (doc 38 §1.2). Fast (<10s). Failure loops back to Patch.
6. **Integration Tests.** Cross-plugin interactions (doc 38 §1.4). Slower (<60s). Failure loops back to Patch or Diagnose.
7. **Deterministic Replay.** A known-good input log is replayed against the patched engine. The checkpoint hash must match the baseline hash, byte-for-byte, for every checkpoint. A mismatch means the patch broke determinism — this is a hard fail, no override.
8. **Performance Benchmarks.** The `village-morning` scenario (or the scenario named in the Proposal) runs at the target frame rate. Memory stays within budget (doc 39). The determinism hash matches the baseline. A regression >10% on any metric loops back to Implement.
9. **Visual Regression.** The renderer produces frames at defined checkpoints; each is compared against a baseline image. A perceptual difference above threshold (default: 2% of pixels, with anti-aliasing awareness) flags a regression. The VLM playtester can override false positives.
10. **Browser/VLM Playtest.** The VLM playtester (doc 45) plays the affected scene. It looks for visual artifacts, broken interactions, missing feedback. The playtest log is the artifact.
11. **Independent Critique.** The Reviewer role (never the Implementer) tries to disprove the proposal's success — adverse inputs, chunk boundaries, repeated actions, multiple seeds, save/load cycles (doc 46 §3). The critique is signed.
12. **Semantic Diff.** The change is summarized in human-readable terms (doc 46 §2): "3 mountain ranges modified, 1 faction removed, 27 settlements affected, 18,421 NPC relationships recalculated." This is what the human operator reads.
13. **Approval or Rollback.** The decision. If approved at the AI's autonomy level, the transaction commits; if escalation was required and not granted, the transaction rolls back. Either way, the audit log records the decision and the reason.

### 6.3 Rollback semantics

A rollback restores the workspace to the Snapshot. It does not partially undo — if step 8 failed, steps 2-7 are not "kept"; the entire patch is reverted. The workspace is discarded; a new transaction starts from the baseline if the AI wants to retry.

The rollback **does not affect the audit log**. The audit log is append-only. A rolled-back transaction is still a transaction; its failure mode is still recorded; the lessons learned still feed the architectural decision ledger (doc 49 §3).

---

## 7. Failure cases

| Failure | Detection | Response |
|---|---|---|
| AI issues a tool call above its autonomy | Gateway rejects at `authorize` | `error.code = 'AutonomyExceeded'`; AI must escalate |
| AI issues a tool call without a capability token | Gateway rejects at `authorize` | `error.code = 'MissingCapabilityToken'`; session may be flagged |
| Gateway loses connection to engine mid-command | Heartbeat timeout (5s) | Gateway marks the command `pending` → `cancelled`; AI may re-issue |
| Engine crashes during a transaction | Engine heartbeat loss | All in-flight transactions roll back to their snapshots; audit log records the crash |
| AI's session expires mid-transaction | Token expiry at Gateway | In-flight transactions continue under the session's last autonomy level; new commands require re-auth |
| Webhook delivery fails for >24h | Retention expiry | Event is dropped; AI reconciles by querying state on reconnect |
| Deterministic replay fails | Hash mismatch | Hard fail; transaction rolls back; the audit log flags the patch as determinism-breaking |
| VLM playtester reports visual regression | Frame diff above threshold | Loops back to Implement; the playtester's report is the artifact |
| Reviewer refuses to sign | IndependentCritique step fails | Transaction cannot advance past step 11; loops back to Propose |
| Human operator rejects the semantic diff | ApprovalOrRollback step fails | Transaction rolls back; the rejection reason feeds the decision ledger |
| Gateway's audit log is full | Disk quota | Gateway refuses new commands (fail-closed); operator must rotate the log |
| AI attempts to change the architect system itself | Tool whitelist | Gateway refuses; only a human operator may modify the architect system (doc 48 §3) |

---

## 8. Rejected alternatives

### 8.1 "A single AI with full access"

The first design: one AI, full engine access, an audit log, and trust. Rejected for three reasons. First, the doctrine (AGENTS.md Part 3) says: "Exhibit reviewer voices; do not self-certify." A single AI that writes and approves its own work has no reviewer. Second, the blast radius of an uncontrolled mutation is the player's save — possibly hours of play, possibly a century of simulation. A single misbehaving AI with full access can destroy that. Third, the project's regulatory and ethical posture requires that a human can attribute any change to a specific role and a specific decision; a single-AI model makes that attribution trivial in theory and meaningless in practice.

### 8.2 "Pure request-response, no webhooks"

The second design: every event is a tool the AI polls. Rejected because polling wastes bandwidth (the AI asks "anything new?" every N seconds, the engine says "no" 99% of the time), adds latency (events arrive at the next poll, not when they happen), and produces a worse audit story (the polling call is audited as a tool call, drowning the actual events in noise). The webhook channel is the standard pattern for engine-to-listener notification; pretending it is the same as request-response produces contortions.

### 8.3 "The browser channel can mutate state"

The third design: the AI drives the engine by simulating clicks in the browser, which the engine interprets as commands. Rejected because (a) it makes the audit trail depend on UI element identity, which is fragile; (b) it conflates observation and control, breaking the channel separation in section 1; (c) it makes programmatic changes indistinguishable from player input, which is exactly what the determinism contract (doc 06) is trying to keep separate. The browser channel may inject input that becomes a command, but the command is recorded as a command, not as a click.

### 8.4 "Three autonomy levels instead of seven"

The fourth design: Observe, Sandbox, Release. Rejected per section 5.2 — the binary-ish model either under-trusts the AI (every interesting change waits for Release approval) or over-trusts it (Release becomes the default for anything touching main). Seven levels let each change progress at the lowest level that suffices.

### 8.5 "The Gateway is in-process with the engine"

The fifth design: the Gateway is a plugin inside the PluginHost. Rejected because (a) it couples the security boundary to the engine's lifecycle — an engine crash takes the Gateway with it, breaking audit continuity; (b) it gives the Gateway access to engine internals it should not see (the player's save, decrypted); (c) it makes the Gateway subject to the same plugin-permission model as mods, which is backwards — the Gateway should be the authority on permissions, not subject to them. The Gateway is a separate process, listening on a separate socket, holding separate secrets.

### 8.6 "Skip steps for 'trivial' changes"

The sixth design: the Architect role may skip Test, Simulate, Benchmark, or Critique for changes it deems trivial. Rejected because "trivial" is exactly the change class where skipping review is most expensive — the change that "obviously" cannot break anything is the change that breaks the determinism hash. The audit log may record a step as `skipped` with a reason, but the skip is signed and visible; skipping the determinism replay for a state-mutating change is forbidden, full stop.

### 8.7 "Self-improvement is autonomous by default"

The seventh design: the AI commits changes at the Integrate level without human approval, and only Release requires a human. Rejected for now — the project is not yet at the maturity level where this is safe (no save migration test corpus, no production-grade red team, no formal verification of the determinism stack). The doctrine (AGENTS.md Part 3) says: "Ship the working thing before the perfect thing." The working thing is a control plane where the AI does most of the work and a human signs at Integrate and Release. Autonomous Integrate is a Phase 7+ goal, not a Phase 1-6 default.

---

## 9. What this document enables

The control plane as specified here enables the canonical AI-driven workflow:

1. The AI **observes** an engine subsystem (through Inspection tools, doc 44 §3).
2. The AI **diagnoses** a gap (through Explanation tools, doc 44 §5, and the World Oracle, doc 49 §4).
3. The AI **researches** solutions (through the research broker, doc 47).
4. The AI **proposes** a change (a typed Proposal, section 4.1).
5. The AI **implements** the change in an isolated workspace (doc 46 §1).
6. The AI **validates** the change through the transactional process (section 6).
7. The AI **presents** the semantic diff and the evidence (doc 46 §2).
8. The change is **committed or rolled back**, and the decision is recorded (doc 49 §3).

Each of these steps is detailed in the companion documents. The control plane is the spine; the companion documents are the limbs.

The doctrine (AGENTS.md Part 3) says: "Design for joy first; the system serves the experience." The control plane is not the experience. The experience is a player playing One Mortal Morning for an hour and wanting a second hour. The control plane exists so that an AI can build, test, and refine that experience at a pace and a rigor a human team alone cannot match. The measure of the control plane is the same as the measure of the engine: does the player want a second hour?
