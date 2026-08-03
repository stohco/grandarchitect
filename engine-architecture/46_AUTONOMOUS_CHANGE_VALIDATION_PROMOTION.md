# 46 — Autonomous Change Validation & Promotion

**Status:** Architecture. How AI changes are validated, promoted, or rolled back.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `06_DETERMINISM_SEEDS_REPLAY` (determinism contract), `11_PERSISTENCE_SAVES_MIGRATION` (save state, migrations), `38_TESTING_PLUGIN_CONFORMANCE` (test classes), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the transactional change process), `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL` (Execution tools), `45_BROWSER_VLM_OBSERVATION_VISUAL_QA` (visual regression, playtesting)
**Read with:** `48_AI_PERMISSIONS_SECURITY_AUDIT` (the approval model), `49_MACHINE_READABLE_CAPABILITY_DECISION_GRAPH` (the semantic diff uses the capability graph)

---

## 0. What this document is

The control plane (doc 43) lets the AI propose changes. The protocol (doc 44) lets the AI call tools. The VLM channel (doc 45) lets the AI see. This document is about **what happens between "I propose this change" and "the change is shipped to players"** — the validation pipeline that turns a proposal into a committed change, or rolls it back with the lessons learned.

The doctrine (AGENTS.md Part 3) says: "Authorize the smallest end-to-end thing that works." The smallest end-to-end thing the validation pipeline produces is a **transaction**: a snapshot, a patch, a build, a test run, a benchmark, a playtest, a critique, a semantic diff, and an approval or rollback. The transaction is the unit of progress. A transaction either commits (the change ships) or rolls back (the workspace is discarded and the audit log retains the attempt). There is no partial commit.

The doctrine also says: "Exhibit reviewer voices; do not self-certify." The validation pipeline is the structural enforcement of that doctrine. The AI that proposes a change is not the AI that approves it; the AI that runs the tests is not the AI that signs off on the results; the human operator (or, at lower autonomy, the Architect role) is the final authority on whether a transaction commits. The falsification requirement (section 3) makes this concrete: the AI must actively try to disprove its own success, and the critique is signed by a different role than the implementation.

---

## 1. The isolated workspace

Every change happens in an **isolated workspace**. The workspace is a complete, disposable copy of the engine's source tree, build cache, assets, world state, and save data, plus a manifest that records exactly what was changed and why. The workspace is the structural unit of "this change is not yet committed; it lives in a sandbox."

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ISOLATED WORKSPACE                                  │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Source control layer                                          │    │
│   │   • git branch + worktree (one per workspace)                 │    │
│   │   • the branch is named: architect/<proposal-id>              │    │
│   │   • the worktree is at: <repo-root>/.architect/<ws-id>        │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Database layer                                                │    │
│   │   • a temporary database (cloned schema, empty data)          │    │
│   │   • populated from a fixture or a cloned save                 │    │
│   │   • identified by ws-id; dropped on workspace dispose         │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Save-state layer                                              │    │
│   │   • a cloned save (seed + tick + command log)                 │    │
│   │   • replayable from scratch in the workspace                  │    │
│   │   • the clone is content-addressed (same save = same hash)    │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Preview world layer                                           │    │
│   │   • a disposable world generated from the cloned save         │    │
│   │   • the VLM playtester plays this world, not the live one     │    │
│   │   • disposed on workspace dispose                              │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Asset staging layer                                           │    │
│   │   • assets imported via asset.import land here                 │    │
│   │   • content-addressed; promotion copies refs, not bytes       │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Build cache layer                                             │    │
│   │   • per-workspace build cache, seeded from the shared cache   │    │
│   │   • avoids re-compiling unchanged modules                     │    │
│   │   • invalidated when the fingerprint changes                  │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Rollback checkpoint layer                                     │    │
│   │   • a snapshot of the workspace at the start of each step     │    │
│   │   • rollback restores to the snapshot, not to a partial state │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Crash recovery layer                                          │    │
│   │   • the workspace's task manifest is durable                   │    │
│   │   • on engine restart, the workspace can resume or roll back  │    │
│   └──────────────────────────────────────────────────────────────┘    │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  Reproducible task manifest                                    │    │
│   │   • every tool call, with inputs and outputs                  │    │
│   │   • sufficient to re-run the workspace from scratch           │    │
│   │   • the manifest is content-addressed and audit-logged        │    │
│   └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface Workspace {
  workspaceId: string;
  /** The proposal this workspace implements. */
  proposalRef: string;
  /** The session that owns this workspace. */
  ownerId: string;
  /** The baseline: the engine state when the workspace was opened. */
  baseline: {
    commitSha: string;
    engineFingerprint: string;
    saveHash: string;
    assetTreeHash: string;
  };
  /** The current state of the workspace. */
  status: 'open' | 'validating' | 'pending-approval' | 'committed' | 'rolled-back' | 'crashed';
  /** The task manifest (section 1.1). */
  taskManifest: TaskManifest;
  /** The rollback checkpoints, one per transactional step. */
  checkpoints: WorkspaceCheckpoint[];
  /** The cost incurred so far. */
  cost: { cpuMs: number; wallMs: number; vlmUsd: number; storageMiB: number };
}

interface WorkspaceCheckpoint {
  step: TransactionalStep;
  takenAt: string;
  /** A pointer to the snapshot (source, db, save, assets, build). */
  snapshotRef: string;
  /** Whether this checkpoint is restorable (some are evicted by quota). */
  restorable: boolean;
}
```

### 1.1 The reproducible task manifest

The task manifest is the workspace's diary. Every tool call — every `definition.patch`, every `test.run`, every `vlm.capture` — is recorded with its inputs, its outputs, its cost, and its audit reference. The manifest is the **proof** that the workspace's state is the result of a deterministic sequence of tool calls. It is also the **recipe** for reproducing the workspace from scratch: give the same manifest to a fresh engine, and you get the same workspace.

```typescript
interface TaskManifest {
  workspaceId: string;
  entries: TaskManifestEntry[];
  /** The hash of the manifest, for content-addressing. */
  manifestHash: string;
}

interface TaskManifestEntry {
  seq: number;
  timestamp: string;
  /** The tool that was called. */
  tool: string;
  /** The inputs (validated against the tool's schema). */
  inputs: Record<string, unknown>;
  /** The outputs (summarized if large). */
  outputs: unknown;
  /** The transactional step this call corresponds to. */
  step: TransactionalStep;
  /** The cost. */
  cost: { cpuMs: number; wallMs: number; vlmUsd: number };
  /** The audit record reference. */
  auditRef: string;
}
```

### 1.2 Workspace lifecycle

```
[open] ──> [validating] ──> [pending-approval] ──> [committed]
                │                   │                  
                │                   v                  
                │             [rolled-back]            
                v                                       
            [crashed] ──> (recovery: resume or rollback)
```

A workspace is opened by the Implementer role, validated by the Execution tools, held for approval by the Architect role, and either committed (the branch merges to main, the save migrates, the assets promote) or rolled back (the branch is deleted, the workspace directory is removed, the audit log retains the manifest).

### 1.3 Workspace failure cases

- **Workspace directory corrupt.** The task manifest is the source of truth; the workspace can be re-created from the manifest and the baseline. If the manifest itself is corrupt, the workspace is unrecoverable; the audit log retains what was done up to the corruption.
- **Save clone failed.** The workspace cannot be opened; the AI must use a different save or escalate.
- **Build cache invalid.** The cache is rebuilt from scratch; the build is slower but correct.
- **Disk quota exceeded.** The workspace is suspended; the AI must either reduce its scope or request more quota.
- **Engine crash mid-validation.** On restart, the workspace is in `crashed` state; the AI may resume (from the last checkpoint) or roll back. The crash dump is an artifact.

---

## 2. The semantic world-state diff

When the AI presents a change to a human operator (or to the Architect role at lower autonomy), the operator does not read a JSON patch. The operator reads a **semantic diff** — a human-readable summary of what changed in the world. The semantic diff is the structural answer to "what did the AI do?" The operator approves or rejects on the basis of the semantic diff; the JSON patch is the evidence, not the surface.

```typescript
interface SemanticDiff {
  /** The proposal this diff implements. */
  proposalRef: string;
  /** The baseline and the candidate. */
  baseline: { commitSha: string; saveHash: string; fingerprint: string };
  candidate: { commitSha: string; saveHash: string; fingerprint: string };
  /** The summary, in one or two sentences. */
  summary: string;
  /** The categories of change. */
  categories: SemanticDiffCategory[];
  /** The affected player experience. */
  playerImpact: PlayerImpactStatement;
  /** The risks the AI identified. */
  risks: RiskAssessment;
  /** The evidence (test results, benchmarks, playtest, critique). */
  evidence: EvidenceRef[];
}

interface SemanticDiffCategory {
  /** 'terrain' | 'faction' | 'npc' | 'quest' | 'asset' | 'code' | ... */
  kind: string;
  /** A human-readable description. */
  description: string;
  /** The counts. */
  counts: { created: number; modified: number; removed: number };
  /** The affected definition/template IDs. */
  affectedIds: string[];
}
```

### 2.1 Example semantic diff

> **Summary.** This change rebalances the spirit-fox encounter in the Cangli Riverlands by reducing the fox's qi pool by 20% and adding a telegraphed dodge window. No new content; one definition patched, one animation graph patched.
>
> **Terrain.** 0 created, 0 modified, 0 removed.
> **Faction.** 0 created, 0 modified, 0 removed.
> **NPC.** 0 created, 0 modified, 0 removed.
> **Definitions.** 0 created, 1 modified, 0 removed. (`ga:bestiary.spirit-fox` — qi pool 100→80, dodge window added at frame 18.)
> **Animation graphs.** 0 created, 1 modified, 0 removed. (`ga:animation.fox-dodge` — added telegraph at frames 12-18.)
> **Code.** 0 files changed.
> **Player impact.** The spirit-fox encounter is now winnable at mortal tier with a deflection build. Telegraphed dodge window matches Monster Hunter World's medium-tier tell timing (12 frames at 60fps). No save migration required; existing saves continue to work.
> **Risks.** Dodge window may be too generous for high-tier cultivators (filed as follow-up). Animation retargeting not required (fox skeleton unchanged).
> **Evidence.** Test run (412 passed, 0 failed). Benchmark (60.0fps avg, 58.9 p95 — within budget). Visual regression (0 checkpoints failed). VLM playtest (5/5 objectives achieved, 2 low-severity issues found, both cosmetic). Independent critique (signed by Reviewer role; one concern raised about high-tier balance, addressed as follow-up).

### 2.2 How the semantic diff is computed

The semantic diff is computed by walking the **capability graph** (doc 49 §2) and the **definition graph** (doc 05), comparing the baseline to the candidate, and grouping the differences by category. The walk is structured; the AI does not free-form summarize. The summary sentence is AI-generated (the AI is good at this), but the counts and the affected IDs are computed from the graphs, not asserted.

### 2.3 Why the semantic diff is non-negotiable

The doctrine (AGENTS.md Part 3) says: "Do not confuse the apparatus with the work." A JSON patch is apparatus. The semantic diff is the work, stated in terms the operator (and the player, eventually) can understand. An operator who approves a change without reading the semantic diff is approving apparatus, not work. The Gateway refuses to submit a transaction for approval without a semantic diff; the audit log records the diff verbatim.

---

## 3. The falsification requirement

The doctrine (AGENTS.md Part 3) says: "Exhibit reviewer voices; do not self-certify." The structural enforcement is the **falsification requirement**: the AI must actively try to disprove its own success before the change is presented for approval. Falsification is not optional. A transaction that did not attempt falsification cannot advance past step 11 (IndependentCritique) of the transactional change process.

```typescript
interface FalsificationSpec {
  /** The proposal being falsified. */
  proposalRef: string;
  /** The adverse scenarios the AI will run. */
  adverseScenarios: AdverseScenario[];
  /** The multiple seeds to run each scenario with. */
  seeds: string[];                // default: 5 seeds
  /** The save/load cycles to test. */
  saveLoadCycles: number;         // default: 3
  /** The frame rates to test at. */
  frameRates: number[];           // default: [60, 30, 15]
  /** The asset-missing scenarios. */
  assetMissingScenarios: string[];
  /** The plugin-failure scenarios. */
  pluginFailureScenarios: string[];
}

interface AdverseScenario {
  name: string;
  description: string;
  /** What the scenario does. */
  steps: string[];
  /** What the scenario is trying to break. */
  attemptingToBreak: string;
  /** The expected behavior — what the AI considers "did not break." */
  passingCondition: string;
}

interface FalsificationReport {
  spec: FalsificationSpec;
  results: {
    scenario: string;
    seed: string;
    framerate: number;
    saveLoadCycle: number;
    passed: boolean;
    failureMode?: string;
    evidenceRef?: string;          // a SMIP, a log, a crash dump
  }[];
  /** The AI's summary: did it disprove its own success? */
  summary: 'not-disproven' | 'disproven' | 'inconclusive';
  /** The Reviewer's signature (a different role from the Implementer). */
  reviewerSignature: { role: ArchitectRole; principalId: string; signedAt: string };
}
```

### 3.1 The standard adverse scenarios

The falsification spec must include at least these adverse scenarios (the AI may add more):

1. **Chunk boundaries.** Trigger the change at every chunk boundary in the affected region. The change must behave identically regardless of which chunk it fires in.
2. **Repeated actions.** Trigger the change 1000 times in succession. No memory leak, no accumulation, no state drift.
3. **Multiple seeds.** Run the affected scenario with 5 different seeds. The change must not be seed-dependent in ways it does not declare.
4. **Save/load cycles.** Save mid-change, load, verify the change's state survives the round-trip. Repeat 3 times.
5. **Low frame rates.** Run the change at 60, 30, and 15 fps. The change must be frame-rate independent (per doc 07's fixed-timestep contract).
6. **Missing assets.** Run the change with one or more assets missing. The engine must degrade gracefully (per doc 41 §3).
7. **Plugin failures.** Run the change with one of the affected plugins failing to init. The engine must detect and report the failure, not corrupt state.
8. **Performance stress.** Run the change with 10x the normal entity count. The change must not crash; it may degrade.

### 3.2 Falsification is signed by a different role

The Implementer role runs the change. The Reviewer role runs the falsification. The Reviewer's signature on the FalsificationReport is the structural enforcement of "do not self-certify." If the Reviewer refuses to sign (because the report is incomplete, the scenarios were too easy, or the failure modes were not investigated), the transaction cannot advance.

### 3.3 Falsification failure cases

- **AI skips a standard scenario.** The Gateway refuses the FalsificationReport; the transaction cannot advance.
- **Adverse scenario crashes the engine.** The crash dump is the evidence; the change is `disproven`; the transaction rolls back.
- **Adverse scenario reveals a non-determinism.** The change is `disproven`; the determinism contract (doc 06) is violated; the transaction rolls back.
- **Reviewer refuses to sign.** The transaction loops back to the Propose step; the Implementer must address the Reviewer's objections.
- **Falsification budget exceeded.** The Reviewer may sign with `summary: 'inconclusive'`; the human operator decides whether to proceed.

---

## 4. The approval pipeline

The approval pipeline is the sequence of autonomy levels a transaction passes through on its way to release. Each level has its own approver, its own evidence requirements, and its own rollback semantics. The pipeline is the structural enforcement of "ship the working thing before the perfect thing": each level is a working thing, more visible than the last, more reversible than the last.

```
┌────────────────────────────────────────────────────────────────────────┐
│              THE APPROVAL PIPELINE                                      │
│                                                                        │
│   [Sandbox]                                                            │
│      │  approver: Implementer (self)                                   │
│      │  evidence: build + unit tests pass                              │
│      │  visible to: the AI session only                                │
│      v                                                                 │
│   [Preview]                                                            │
│      │  approver: Architect role                                       │
│      │  evidence: + integration + visual regression + playtest         │
│      │  visible to: the AI + the human operator (if they look)         │
│      v                                                                 │
│   [Branch]                                                             │
│      │  approver: Architect role (with Reviewer signature)             │
│      │  evidence: + deterministic replay + benchmark                   │
│      │  visible to: CI; the branch is named and persistent             │
│      v                                                                 │
│   [Integrate]                                                          │
│      │  approver: human operator (default) or Architect (if enabled)   │
│      │  evidence: + independent critique + semantic diff               │
│      │  visible to: main branch; next build includes the change        │
│      v                                                                 │
│   [Release]                                                            │
│      approver: human operator (always)                                 │
│      evidence: + release-candidate build + save migration test         │
│      visible to: players                                               │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 The five levels, in detail

```typescript
interface ApprovalLevelSpec {
  level: 'Sandbox' | 'Preview' | 'Branch' | 'Integrate' | 'Release';
  approver: 'implementer' | 'architect' | 'reviewer' | 'human';
  evidenceRequired: TransactionalStep[];
  rollbackCost: 'trivial' | 'minutes' | 'hours' | 'days' | 'irreversible';
  visibleTo: string[];
  /** Whether the AI may self-approve at this level (per the autonomy model). */
  selfApprovalAllowed: boolean;
}

const APPROVAL_LEVELS: ApprovalLevelSpec[] = [
  {
    level: 'Sandbox',
    approver: 'implementer',
    evidenceRequired: ['Snapshot', 'Patch', 'Build', 'StaticValidation', 'UnitTests'],
    rollbackCost: 'trivial',
    visibleTo: ['the AI session'],
    selfApprovalAllowed: true,
  },
  {
    level: 'Preview',
    approver: 'architect',
    evidenceRequired: ['IntegrationTests', 'VisualRegression', 'BrowserVlmPlaytest'],
    rollbackCost: 'minutes',
    visibleTo: ['the AI session', 'the human operator (on demand)'],
    selfApprovalAllowed: true,  // at Preview, the Architect (a different role) approves
  },
  {
    level: 'Branch',
    approver: 'reviewer',
    evidenceRequired: ['DeterministicReplay', 'PerformanceBenchmarks'],
    rollbackCost: 'minutes',
    visibleTo: ['CI', 'the human operator'],
    selfApprovalAllowed: true,  // with Reviewer signature
  },
  {
    level: 'Integrate',
    approver: 'human',
    evidenceRequired: ['IndependentCritique', 'SemanticDiff'],
    rollbackCost: 'hours',     // a revert on main; CI re-runs
    visibleTo: ['main branch', 'next build'],
    selfApprovalAllowed: false, // for now; see doc 43 §8.7
  },
  {
    level: 'Release',
    approver: 'human',
    evidenceRequired: ['ReleaseCandidateBuild', 'SaveMigrationTest'],
    rollbackCost: 'days',      // a release revert; players affected
    visibleTo: ['players'],
    selfApprovalAllowed: false,
  },
];
```

### 4.2 What "approval" means

An approval at level N is:

1. **A signature** by the approver (a role principal or a human operator), recorded in the audit log.
2. **Evidence** that all required transactional steps for level N have passed.
3. **A promotion** of the workspace's state to the next level's visibility (e.g., Sandbox → Preview makes the workspace's preview build visible to the VLM playtester).
4. **A rollback path** that is documented and tested at the level's rollback cost.

An approval is **not** a permanent commit. The transaction can still roll back at a higher level if new evidence emerges. The approval is "this level is satisfied; proceed to the next."

### 4.3 Promotion mechanics

When a transaction is approved at level N, the workspace's state is **promoted** to level N+1's visibility:

- Sandbox → Preview: the workspace's preview build is launched; the VLM playtester can play it.
- Preview → Branch: the workspace's git branch is pushed to the remote; CI runs.
- Branch → Integrate: the branch is merged to main; the main build now includes the change.
- Integrate → Release: a release-candidate build is cut; the save migration test runs; if it passes, the build is promoted to the release channel.

Each promotion is **atomic** — either the entire workspace state moves to the new level, or none of it does. There is no "the code is on main but the assets are not yet" partial state.

### 4.4 Rollback at each level

| Level | Rollback action | Cost |
|---|---|---|
| Sandbox | Discard the workspace | Trivial |
| Preview | Stop the preview build; discard the workspace | Minutes |
| Branch | Delete the branch; the workspace is discarded | Minutes |
| Integrate | Revert the merge on main; CI re-runs | Hours |
| Release | Cut a new release that reverts the change; ship it | Days (and players are affected) |

The cost of rollback scales with the level. This is intentional — it biases the system toward catching problems early, when rollback is cheap. The falsification requirement (section 3) exists precisely to catch problems at Sandbox or Preview, when rollback is trivial, not at Release, when rollback is a player-facing incident.

---

## 5. Crash recovery and resumability

A transaction may span hours (a long simulation, a multi-scenario playtest). The engine may crash, the AI session may expire, the operator may close their laptop. The validation pipeline must survive these interruptions.

```typescript
interface TransactionResumption {
  /** The transaction to resume. */
  transactionId: string;
  /** The last completed step. */
  lastCompletedStep: TransactionalStep;
  /** Whether the workspace's state at the last checkpoint is intact. */
  checkpointIntact: boolean;
  /** The resume action. */
  action: 'resume' | 'rollback' | 'abort';
}

interface CrashRecoveryReport {
  /** The transactions that were in-flight at crash time. */
  affectedTransactions: { transactionId: string; status: 'crashed' }[];
  /** For each, whether the workspace's last checkpoint is restorable. */
  restorable: { transactionId: string; restorable: boolean }[];
  /** The recommended action for each. */
  recommendation: { transactionId: string; action: 'resume' | 'rollback' }[];
}
```

On engine restart, the crash recovery report lists every transaction that was in-flight, whether its last checkpoint is restorable, and the recommended action. The AI (or the operator) decides whether to resume or roll back. A transaction that resumed re-runs the step it crashed on, from the last checkpoint; the audit log records both the crash and the resume.

---

## 6. Failure cases

| Failure | Detection | Response |
|---|---|---|
| Workspace cannot be opened | Resource check | Transaction aborts; AI escalates or picks a different baseline |
| Build fails in the workspace | Build tool returns errors | Transaction loops back to Patch |
| Test fails | Test tool returns failures | Transaction loops back to Patch; the failing test is the artifact |
| Determinism hash mismatch | Replay step fails | Transaction rolls back; the patch is flagged as determinism-breaking |
| Benchmark regression | Benchmark step fails | Transaction loops back to Implement |
| Visual regression | Visual regression step fails | Transaction loops back to Implement; the diff image is the artifact |
| Playtest stuck | Playtest watchdog | Playtest is paused; AI diagnoses or cancels |
| Falsification disproves the change | Falsification step fails | Transaction rolls back; the disproval is recorded in the decision ledger |
| Reviewer refuses to sign | IndependentCritique step fails | Transaction loops back to Propose; the Reviewer's objections are the artifact |
| Human operator rejects the semantic diff | Approval step fails | Transaction rolls back; the rejection reason feeds the decision ledger |
| Crash mid-transaction | Engine heartbeat loss | Crash recovery on restart; resume or roll back per section 5 |
| Promotion conflicts with another transaction | Merge conflict at Integrate | Transaction is paused; the conflict is surfaced for resolution |
| Save migration test fails at Release | Migration test fails | Release is blocked; the migration is fixed or the release is delayed |

---

## 7. Rejected alternatives

### 7.1 "Direct commits to main, with rollback if needed"

The first design: the AI commits to main directly; if the change breaks something, the operator reverts. Rejected because (a) the cost of a bad commit on main is hours (CI re-runs, downstream work blocked) while the cost of a bad commit in a workspace is trivial; (b) the doctrine (AGENTS.md Part 1) says: "Choose the simplest implementation that fully meets the current requirements." The simplest implementation that meets the requirement of "the AI can change the engine without breaking it" is the isolated workspace, not direct commits with rollback. The workspace is the brake that makes direct commits unnecessary.

### 7.2 "Merge to main without independent critique"

The second design: the Implementer's tests are sufficient; the IndependentCritique step is overhead. Rejected per the doctrine (AGENTS.md Part 3): "Exhibit reviewer voices; do not self-certify." The Implementer's tests prove the change does what the Implementer intended; they do not prove the change does not also do something the Implementer did not intend. The Reviewer's falsification is the structural check for unintended consequences.

### 7.3 "AI can self-approve at Integrate"

The third design: the AI commits to main autonomously at Integrate, with a human approval only at Release. Rejected for now (per doc 43 §8.7) — the project is not yet at the maturity level where this is safe. The doctrine says: "Ship the working thing before the perfect thing." The working thing is a pipeline where the AI does most of the work and a human signs at Integrate and Release. Autonomous Integrate is a Phase 7+ goal, not a Phase 1-6 default.

### 7.4 "Free-form semantic diffs (the AI summarizes)"

The fourth design: the AI writes the semantic diff free-form, as natural language. Rejected because the counts and the affected IDs must be computed, not asserted. The doctrine (AGENTS.md Part 3) says: "Do not confuse the apparatus with the work." A free-form summary that gets the counts wrong is apparatus dressed as work. The structured walk of the capability and definition graphs (section 2.2) produces counts the operator can trust; the AI's natural-language summary is layered on top, not substituted for the structure.

### 7.5 "Falsification is optional for 'safe' changes"

The fifth design: the AI may skip falsification for changes it deems safe (a one-line shader tweak, a parameter adjustment). Rejected because "safe" is exactly the change class where skipping review is most expensive — the trivial change is the change that breaks the determinism hash, every time. The falsification requirement applies to every state-mutating transaction, full stop. The AI may scope the falsification (fewer seeds, fewer scenarios) for low-risk changes, but it may not skip it.

### 7.6 "Promotion is non-atomic (code first, assets later)"

The sixth design: promotion happens piece-by-piece — code merges first, assets promote later, save migration runs separately. Rejected because partial promotion leaves the engine in an inconsistent state — the code references assets that are not yet promoted, or the save migration ran against assets that are not yet promoted. Atomic promotion (the entire workspace state moves to the new level, or none of it does) is the simplest implementation that does not produce these inconsistencies.

---

## 8. What this document enables

The validation and promotion pipeline as specified here enables:

- **Isolated workspaces** (section 1) where the AI can change anything without risk to main.
- **Reproducible task manifests** (section 1.1) that prove what was done and allow re-running from scratch.
- **Semantic world-state diffs** (section 2) that let the operator approve work, not apparatus.
- **Falsification** (section 3) that structurally enforces "do not self-certify."
- **A five-level approval pipeline** (section 4) where each level is a working thing, more visible and less reversible than the last.
- **Crash recovery** (section 5) that survives engine restarts and session expirations.

The doctrine (AGENTS.md Part 3) says: "Add exits, not gates." The pipeline is five exits, not five gates. Each exit is a level at which the AI has produced a working thing and may proceed. Each exit has a corresponding rollback, so a bad exit is recoverable. The pipeline is the structural answer to "how does the AI change the engine without breaking it?" — by changing it in a workspace, validating it through falsification, and promoting it one level at a time, with a human signing at the level where the change becomes player-visible.
