# 48 — AI Permissions, Security & Audit

**Status:** Architecture. The security model that governs AI control of the engine.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `35_MODDING_UNTRUSTED_CONTENT` (sandbox model), `41_SECURITY_FAILURE_RECOVERY` (security principals), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the Architect Gateway, autonomy levels), `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL` (the tool registry, capability tokens)
**Read with:** `46_AUTONOMOUS_CHANGE_VALIDATION_PROMOTION` (the approval pipeline), `47_RESEARCH_GITHUB_DEPENDENCY_ACQUISITION` (dependency import is an approval-gated action), `49_MACHINE_READABLE_CAPABILITY_DECISION_GRAPH` (the audit trail queries the capability graph)

---

## 0. What this document is

The control plane (doc 43) gives an AI the same degree of access as a senior engine engineer. That access is dangerous. A misbehaving AI — whether through bug, hallucination, prompt injection, or compromise — can corrupt the player's save, break the determinism contract, exfiltrate data, or ship a broken build to players. This document defines the security model that prevents those outcomes: the **permission model** that gates every tool call, the **autonomy/approval split** that gates every state-mutating action, the **session model** that authenticates and bounds every AI principal, and the **audit trail** that records every action with who, what, when, why, what changed, and what the result was.

The doctrine (AGENTS.md Part 3) says: "Build the engine, not just the brake." The security model is the brake, and this document is explicit that the brake is paired with the engine (the tool registry, the autonomy model, the approval pipeline). But the brake is real. A control plane without a security model is a control plane that cannot be shipped.

The doctrine also says (AGENTS.md Part 3): "Exhibit reviewer voices; do not self-certify." The audit trail is the structural enforcement of that doctrine for security: every action is recorded, every record is reviewable, and the SecurityReviewer role exists to inspect the trail and surface anomalies. A security model that the AI self-certifies is not a security model.

This document covers AI control specifically. The engine's broader security model (mod sandboxing, save integrity, failure recovery) is in doc 35 and doc 41; this document builds on those, it does not replace them.

---

## 1. The security model

The security model has four principals, arranged by trust:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       TRUST BOUNDARIES                                  │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  TRUSTED: the engine (kernel, determinism, core plugins)     │    │
│   │   • full PluginHost access                                    │    │
│   │   • reads/writes the player's save (via the save system)     │    │
│   │   • holds signing keys, DB passwords, webhook secrets        │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                              │  (declared permissions, enforced)       │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  TRUSTED-BUT-PERMISSIONED: engine plugins                    │    │
│   │   • full PluginHost, but manifest declares permissions        │    │
│   │   • e.g. ga:renderer (gpu: full), ga:physics (worker: signed)│    │
│   └──────────────────────────────────────────────────────────────┘    │
│                              │  (sandbox + signed manifest)            │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  UNTRUSTED: mods (doc 35)                                    │    │
│   │   • SandboxedHost only; no DOM, no device, no fetch           │    │
│   │   • signed but not audited                                   │    │
│   └──────────────────────────────────────────────────────────────┘    │
│                              │  (Gateway-mediated; capability tokens)  │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │  SEMI-TRUSTED: the AI principals                             │    │
│   │   • reach the engine only through the Architect Gateway      │    │
│   │   • authenticated, role-bound, autonomy-bound, audit-logged  │    │
│   │   • state-mutating actions gated by capability tokens        │    │
│   │   • hard-gated actions require human approval (section 3)    │    │
│   └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

The security model has four principals:

1. **The engine** (trusted). The kernel, the determinism stack, the core plugins. These run with full privileges.
2. **Engine plugins** (trusted, but permissioned). Plugins the operator has approved. They run with the full PluginHost but declare their permissions in their manifest.
3. **Mods** (untrusted). Third-party plugins, signed but not audited. They run in the sandbox (doc 35).
4. **The AI** (semi-trusted). The AI principals that connect through the Architect Gateway. They are authenticated, role-bound, autonomy-bound, and audit-logged, but they are not trusted to mutate state without permission.

The security model's goal is: **an AI, even a compromised AI, cannot corrupt the player's save, cannot break the determinism contract, cannot exfiltrate data, and cannot ship a broken build to players without a human's explicit approval.**

```typescript
interface AISecurityModel {
  /** The trust boundary: AI is semi-trusted, gated by the Gateway. */
  trustBoundary: 'gateway-mediated';
  /** Every AI action is authenticated, authorized, and audited. */
  authentication: 'session + short-lived capability token';
  /** State-mutating actions are gated by autonomy level + approval. */
  authorization: 'autonomy + approval';
  /** Every action is recorded in the audit trail (section 5). */
  audit: 'append-only, tamper-evident';
  /** The player's save is never directly accessible to the AI. */
  saveAccess: 'indirect, via the save system';
  /** Network access from the AI is forbidden; the research broker is the only path. */
  networkAccess: 'forbidden; broker-mediated';
  /** The architect system itself can only be modified by a human. */
  architectSystemAccess: 'human-only';
}
```

---

## 2. Plugin permissions

The plugin permission model (doc 35 §2.2, doc 41 §1.2) is the foundation. Engine plugins declare their permissions in their manifest; the Gateway does not re-permission them. The AI's permissions are layered on top: the AI may call a plugin's tools only if (a) the plugin's permissions are granted (engine-level) AND (b) the AI's session has the capability token for that tool (AI-level).

```typescript
/** What a plugin may do — declared in the manifest, enforced by the kernel. */
type PluginPermission =
  | { kind: 'read-state'; pluginId: string }
  | { kind: 'emit-event'; namespace: string }
  | { kind: 'patch-definition'; targetId: string }
  | { kind: 'shader-patch'; chunk: string }
  | { kind: 'network'; origin: string }
  | { kind: 'storage'; quotaMiB: number }
  | { kind: 'worker'; signed: boolean }
  | { kind: 'gpu'; access: 'full' | 'proxy' };

/** What the AI may do — granted per session, enforced by the Gateway. */
interface AICapability {
  /** The tool the AI may call. */
  tool: string;
  /** The autonomy level at which the AI may call it. */
  maxAutonomy: AutonomyLevel;
  /** Whether the capability is constrained to specific arguments. */
  argConstraints?: Record<string, unknown>;
  /** When the capability expires. */
  expiresAt: string;
  /** Who granted the capability. */
  grantedBy: string;
  /** The single-use token (for state-mutating tools). */
  token: string;
  /** Whether the token is single-use. */
  singleUse: boolean;
}
```

### 2.1 Capability tokens

Every state-mutating tool call requires a **capability token**. The token is:

- **Bound to the session.** A token from session A does not work in session B.
- **Bound to the tool.** A token for `definition.patch` does not work for `template.create`.
- **Bound to the autonomy level.** A token for `Sandbox` does not work at `Preview`.
- **Single-use for state-mutating tools.** A used token is invalid; the AI must request a new one.
- **Short-lived.** Default: 5 minutes. A token older than its TTL is refused.

The Gateway issues capability tokens when the AI escalates (doc 43 §5.1) or when a session is established with a baseline capability set. The audit log records every token issued and every token used.

### 2.2 Why capability tokens, not just role checks

A role check ("the Implementer role may call `definition.patch`") is necessary but not sufficient. It does not prevent replay (a captured call could be re-issued), it does not bound the call to a specific autonomy level, and it does not expire. Capability tokens add: replay resistance (single-use), autonomy binding (the token is for a specific level), and expiration (the TTL). The combination of role + capability token is the standard pattern in capability-based security; the engine adopts it.

---

## 3. What the AI can do autonomously vs. what requires approval

The autonomy model (doc 43 §5) defines seven levels. This section specifies, for each level, what the AI may do without approval and what requires escalation.

```typescript
interface AutonomyApprovalMatrix {
  level: AutonomyLevel;
  /** What the AI may do without any approval. */
  autonomous: string[];
  /** What requires the Architect role's approval (a different role). */
  requiresArchitectApproval: string[];
  /** What requires a human operator's approval. */
  requiresHumanApproval: string[];
  /** What is forbidden entirely (to the AI). */
  forbidden: string[];
}
```

### 3.1 The full matrix

| Action | Observe | Diagnose | Sandbox | Preview | Branch | Integrate | Release |
|---|---|---|---|---|---|---|---|
| Inspect any system | autonomous | autonomous | autonomous | autonomous | autonomous | autonomous | autonomous |
| Run explanation traces | — | autonomous | autonomous | autonomous | autonomous | autonomous | autonomous |
| Write Proposals | — | autonomous | autonomous | autonomous | autonomous | autonomous | autonomous |
| Open a workspace | — | — | autonomous | autonomous | autonomous | autonomous | autonomous |
| Patch definitions/templates | — | — | autonomous | autonomous | autonomous | autonomous | autonomous |
| Scaffold plugins | — | — | autonomous | autonomous | autonomous | autonomous | autonomous |
| Run preview build | — | — | — | autonomous | autonomous | autonomous | autonomous |
| Run VLM playtest | — | — | — | autonomous | autonomous | autonomous | autonomous |
| Push to a branch | — | — | — | — | autonomous | autonomous | autonomous |
| Merge to main | — | — | — | — | — | **human** | autonomous* |
| Cut a release build | — | — | — | — | — | — | **human** |
| Run save migration | — | — | — | — | — | — | **human** |
| **Delete a world** | — | — | — | — | — | — | **human** |
| **Rewrite migrations** | — | — | — | — | — | — | **human** |
| **Change permissions** | — | — | — | — | — | — | **human** |
| **Import dependencies** | — | — | — | — | — | — | **human** |
| **Remove systems** | — | — | — | — | — | — | **human** |
| **Merge large changes** | — | — | — | — | — | — | **human** |
| **Publish builds** | — | — | — | — | — | — | **human** |
| **Access credentials** | — | — | — | — | — | — | **human** |
| **Change the architect system** | — | — | — | — | — | — | **forbidden** |

\* At Release autonomy, the AI may merge to main if the human has already approved the Release; the merge is part of the release.

### 3.2 The hard-gated actions

The bolded actions in the matrix above are **hard-gated** — they require a human's explicit approval, full stop, regardless of the AI's autonomy level. These are:

- **Delete a world.** The player's save is sacred (doc 41 §1.1). The AI may not delete a world, ever, without a human's approval.
- **Rewrite migrations.** Migrations transform saves from old fingerprints to new ones (doc 06 §6.4). A broken migration corrupts every save that uses it. The AI may write new migrations; it may not rewrite existing ones without human approval.
- **Change permissions.** A permission change is a security change. The AI may propose permission changes; the human approves.
- **Import dependencies.** A new dependency is a new attack surface. The AI may research dependencies (doc 47); the human approves the import.
- **Remove systems.** Removing a system (deprecating a plugin, removing a capability) is a breaking change for any save that depends on it. The AI may propose removal; the human approves.
- **Merge large changes.** "Large" is defined per-project (default: >1000 lines of diff, or >10 files changed). Large changes carry large risk; the human approves.
- **Publish builds.** Publishing is the point of no return — players see the build. The human approves.
- **Access credentials.** Credentials (API keys, signing keys, database passwords) are never exposed to the AI. The AI may request a credential-scoped operation (e.g., "sign this build"); the Gateway performs the operation with the credential, never exposing it to the AI.
- **Change the architect system.** The architect system (the Gateway, the audit log, the autonomy model, this document) is the foundation of the AI's own security. The AI may not modify it; only a human may. This is the structural prevention of "the AI rewrites its own leash."

### 3.3 Why these actions are hard-gated

The doctrine (AGENTS.md Part 3) says: "Confront the central tension directly." The tension is between "the AI is more efficient than a human at most tasks" and "some tasks have irreversible consequences that a human must own." The hard-gated actions are the irreversible ones: deleting a save, breaking a migration, publishing a build, changing the security model. The AI may propose, recommend, and prepare these actions; the human decides. The doctrine also says: "State the calendar and the budget." The hard gates are the budget on the AI's authority — explicit, named, and not negotiable.

---

## 4. Session management

Every AI connection is a **session**. Sessions are authenticated, short-lived, capability-bound, and audit-logged. The Gateway does not accept any AI traffic without a valid session.

```typescript
interface ArchitectSession {
  /** The session ID (ULID). */
  sessionId: string;
  /** The AI principal's identity. */
  principalId: string;       // e.g. 'ai:architect:claude-opus-4'
  /** The role this session is scoped to. */
  role: ArchitectRole;
  /** The user (human) who authorized this session. */
  authorizedBy: string;      // human principal ID
  /** The autonomy ceiling. */
  autonomy: AutonomyLevel;
  /** The capabilities granted. */
  capabilities: AICapability[];
  /** When the session was issued. */
  issuedAt: string;
  /** When the session expires. */
  expiresAt: string;         // default: 15 minutes
  /** The renewal token, to extend before expiry. */
  renewalToken: string;
  /** The IP and transport the session was issued from. */
  origin: { ip: string; transport: 'ws' | 'http' | 'mcp' };
  /** The session's audit log partition. */
  auditPartition: string;
}
```

### 4.1 Authentication

Sessions are established by an **authentication flow**:

1. The AI presents a **principal credential** (an API key or a signed token) to the Gateway's `/auth` endpoint.
2. The Gateway verifies the credential against the principal registry (a list of AI principals the operator has approved).
3. The Gateway issues a session, scoped to the principal's allowed roles and autonomy ceiling.
4. The Gateway returns the session ID and a renewal token.

```typescript
interface AuthRequest {
  principalId: string;
  credential: { kind: 'api-key' | 'signed-token'; value: string };
  requestedRole: ArchitectRole;
  requestedAutonomy: AutonomyLevel;
  /** The human who authorized this session (for audit). */
  humanAuthorization: { humanId: string; signature: string };
}

interface AuthResponse {
  session: ArchitectSession;
  /** The first capability tokens, for the requested role's baseline tools. */
  capabilityTokens: AICapability[];
}
```

### 4.2 Short-lived tokens

Sessions are **short-lived** (default: 15 minutes). Capability tokens are shorter (default: 5 minutes). The short lifetime limits the blast radius of a stolen token — a token captured by an attacker is useful for minutes, not hours. The AI may renew a session before expiry using the renewal token; renewal re-authenticates the human authorization if the session has been idle beyond a threshold (default: 1 hour).

### 4.3 Explicit capabilities

A session does not get "all tools the role allows." It gets **explicit capabilities** — a list of (tool, autonomy, constraints, expiry) tuples. The capability list is the structural enforcement of least privilege: the AI can call only what it has been explicitly granted, even within its role's allowed tools. The Gateway refuses any call not backed by a matching capability.

### 4.4 User and agent identities

Every session carries two identities: the **agent identity** (the AI principal) and the **user identity** (the human who authorized the session). The audit log records both. This is the structural answer to "who is responsible for what the AI did?" — the AI did the work, the human authorized the work, and both are named in the audit record.

### 4.5 Session expiration

When a session expires, all in-flight async jobs continue under the session's last autonomy level (so a long simulation does not abort because the session timed out), but new commands are refused. The AI must re-authenticate to continue. The audit log records the expiration and the re-authentication.

### 4.6 Encrypted transport

All AI traffic is over TLS (WebSocket Secure or HTTPS). The Gateway terminates TLS; the engine's internal socket (between Gateway and PluginHost) is plaintext but bound to a Unix domain socket or localhost-only TCP, with no external exposure. The webhook channel's outbound HTTPS is signed with HMAC-SHA256 (doc 43 §1.1).

---

## 5. The audit trail

Every AI action is recorded in the audit trail. The audit trail is **append-only**, **tamper-evident** (each entry is chained to the previous by hash), and **durable** (replicated to cold storage nightly). The audit trail is the operator's tool for understanding what the AI did; it is the SecurityReviewer's tool for detecting anomalies; it is the post-incident investigator's tool for reconstructing what happened.

```typescript
interface AuditRecord {
  /** The record ID (ULID). */
  recordId: string;
  /** The hash of the previous record (chain). */
  previousHash: string;
  /** The hash of this record's content. */
  contentHash: string;

  /** WHO: the agent identity. */
  agent: { principalId: string; role: ArchitectRole };
  /** WHO: the human who authorized the session. */
  human: { principalId: string };
  /** WHAT: the tool that was called. */
  tool: string;
  /** WHAT: the arguments. */
  args: Record<string, unknown>;
  /** WHEN: the timestamp. */
  timestamp: string;
  /** WHEN: the engine tick, if applicable. */
  tick?: bigint;
  /** WHY: the reason the AI gave for the call. */
  reason: string;
  /** WHY: the proposal this call belongs to, if any. */
  proposalRef?: string;
  /** WHAT CHANGED: the before-state (for mutating tools). */
  before?: unknown;
  /** WHAT CHANGED: the after-state (for mutating tools). */
  after?: unknown;
  /** WHAT CHANGED: the patch (for mutating tools). */
  patch?: JsonPatch;
  /** WHAT WAS THE RESULT: the outcome. */
  result: { status: 'ok' | 'error' | 'cancelled'; summary: string; artifacts?: ArtifactRef[] };
  /** The capability token used (hashed, not raw). */
  capabilityTokenHash: string;
  /** The autonomy level asserted. */
  autonomy: AutonomyLevel;
  /** The session ID. */
  sessionId: string;
  /** The cost. */
  cost: { cpuMs: number; wallMs: number; vlmUsd: number };
}
```

### 5.1 The audit queries

The audit trail is queryable. The SecurityReviewer role (and the human operator) can query by:

- **Who.** All actions by a specific agent principal, or all actions authorized by a specific human.
- **What.** All calls to a specific tool, or all calls that mutated a specific definition/entity/asset.
- **When.** All actions in a time range.
- **Why.** All actions referencing a specific proposal.
- **What changed.** All actions that touched a specific entity, region, or save.
- **What was the result.** All actions that failed, all actions that were cancelled, all actions that produced a specific artifact.

```typescript
interface AuditQuery {
  agent?: string;
  human?: string;
  tool?: string;
  timeRange?: { from: string; to: string };
  proposalRef?: string;
  affectedEntity?: number;
  affectedDefinition?: string;
  resultStatus?: 'ok' | 'error' | 'cancelled';
  /** Pagination. */
  cursor?: string;
  limit?: number;  // default 100, max 1000
}

interface AuditQueryResult {
  records: AuditRecord[];
  nextCursor?: string;
  /** Whether the query was truncated (hit the limit). */
  truncated: boolean;
}
```

### 5.2 Tamper-evidence

Each audit record's `contentHash` is `SHA-256(previousHash + recordFields)`. Changing any field of any record invalidates the chain. The Gateway publishes the latest chain hash to a tamper-evident log (a simple Merkle tree, or an external service like a transparency log) at fixed intervals (default: hourly). An attacker who modifies the audit log cannot do so without breaking the chain, and the published hashes detect the break.

### 5.3 Audit retention

Audit records are retained for the lifetime of the engine's save data, plus 7 years (a regulatory default; configurable). Records older than the retention period are archived to cold storage and may be purged. The audit log's storage cost is bounded by configuring per-session audit verbosity (a low-stakes session may record less detail than a release-stakes session).

### 5.4 What is NOT audited

- **Inspection tool calls are audited** (who read what), but the response payload is summarized, not stored verbatim — the volume would be unmanageable.
- **VLM frame captures are audited** (which session captured which frame), but the frames themselves are stored in the artifact store, not the audit log.
- **Player input is not audited** by the AI audit trail — it is recorded in the input log (doc 06) for determinism, which is a separate concern.

---

## 6. Failure cases

| Failure | Detection | Response |
|---|---|---|
| AI calls a tool without a capability token | Gateway authorization | `PermissionDenied`; session flagged for review |
| AI calls a tool above its autonomy | Gateway authorization | `AutonomyExceeded`; AI must escalate or be refused |
| AI calls a hard-gated action without human approval | Gateway authorization | `PermissionDenied` with `requiresHumanApproval: true` |
| Stolen capability token replayed | Single-use check | `PermissionDenied`; the original session is flagged |
| Session expired mid-transaction | Token TTL check | New commands refused; in-flight async continues; AI re-authenticates |
| Gateway audit log disk full | Disk quota | Gateway fails closed; new commands refused; operator rotates log |
| Audit chain tampering detected | Hash verification | Gateway fails closed; security incident declared; operator investigates |
| AI attempts to access credentials | Tool whitelist | `PermissionDenied`; the credential is never exposed |
| AI attempts to change the architect system | Tool whitelist | `PermissionDenied`; only a human may modify the architect system |
| AI exfiltrates data through VLM frame | VLM output inspection | SecurityReview flags the session; the VLM cost anomaly is detected |
| Compromised AI escalates autonomy repeatedly | Escalation rate limit | Gateway throttles; operator is paged |
| Human principal's credentials stolen | Anomaly detection | All sessions authorized by that human are revoked; operator investigates |
| Gateway compromise | Audit anomaly detection | The Gateway holds no saves; engine continues; audit log detects the breach |

---

## 7. Rejected alternatives

### 7.1 "Trust the AI fully, audit after the fact"

The first design: the AI has full access, the audit log records everything, and misuse is detected after the fact. Rejected because (a) the player's save is sacred — "we will know who corrupted it" is not the same as "we will prevent it from being corrupted"; (b) the audit log is reactive, not preventive — it tells you what happened, not what is about to happen; (c) the doctrine (AGENTS.md Part 3) says: "Build the engine, not just the brake." A control plane with audit but no permissions is all brake and no engine; the AI is effectively a human, with all the cost and none of the speed. The permission model is the engine; the audit is the brake; both are necessary.

### 7.2 "Role checks are sufficient (no capability tokens)"

The second design: the Gateway checks the session's role and the tool's `requiresAutonomy`; no tokens. Rejected per section 2.2 — role checks do not prevent replay, do not bind to autonomy, do not expire. Capability tokens add replay resistance, autonomy binding, and expiration, at the cost of one extra token-issue call per state-mutating action. The cost is small; the security gain is large.

### 7.3 "The AI can access credentials, with audit"

The third design: the AI is given credentials (API keys, signing keys) and audited when it uses them. Rejected because (a) a credential, once exposed, can be exfiltrated and used outside the audit trail; (b) the AI does not need the credential, it needs the operation (sign this build, post this webhook); (c) the Gateway can perform the operation with the credential, never exposing it. Credential-scoped operations are the standard pattern; the engine adopts it.

### 7.4 "The AI can modify the architect system, with human approval"

The fourth design: the AI may modify the Gateway, the audit log, the autonomy model, with a human's approval. Rejected because (a) the architect system is the foundation of the AI's own security — if the AI can modify it, the AI can modify it to remove its own restrictions; (b) the human's approval is not a sufficient safeguard — a human cannot meaningfully review a change to the security model in the time available; (c) the doctrine (AGENTS.md Part 3) says: "Confront the central tension directly." The tension is "the AI is more capable than a human at most tasks" and "the security model must not be modifiable by the AI." The resolution is that the AI may propose changes to the architect system (as a Proposal artifact, reviewed by humans), but the implementation is performed by a human, with the AI's involvement limited to inspection. The architect system is human-only, by design.

### 7.5 "Audit log is mutable, for performance"

The fifth design: the audit log is a regular database table, mutable for performance (deletions, updates). Rejected because (a) a mutable audit log is not an audit log — it is a log that can be tampered with; (b) the tamper-evident chain (section 5.2) is cheap (one SHA-256 per record); (c) the regulatory and operational cost of a non-tamper-evident log is high. The audit log is append-only, full stop.

### 7.6 "Sessions last forever (no expiration)"

The sixth design: once authenticated, the AI's session is valid until explicitly revoked. Rejected because (a) a stolen session is useful forever, which is a large blast radius; (b) the doctrine (AGENTS.md Part 3) says: "State the calendar and the budget." Session expiration is the budget on the AI's authority — explicit, named, and short. The 15-minute default is calibrated against the maximum time an attacker could usefully exploit a stolen session without being detected.

### 7.7 "All actions require human approval"

The seventh design: every AI action requires a human's approval. Rejected because (a) it makes the AI useless — the AI's value is in doing work without a human in the loop; (b) the doctrine (AGENTS.md Part 3) says: "Authorize the smallest end-to-end thing that works." The smallest end-to-end thing is the AI doing inspection, diagnosis, and sandbox-level work autonomously, with human approval at the levels where the consequences become irreversible. The hard-gated actions (section 3.2) are the irreversibility threshold; below it, the AI is autonomous; above it, the human decides.

---

## 8. What this document enables

The security model as specified here enables:

- **Authenticated, role-bound, autonomy-bound AI sessions** (section 4).
- **Capability-token-gated tool calls**, with replay resistance and expiration (section 2).
- **A clear autonomous-vs-approved matrix**, with hard-gated actions for irreversible consequences (section 3).
- **A tamper-evident, append-only audit trail** that records who, what, when, why, what changed, and what the result was (section 5).
- **A clear separation** between the AI's authority (which is broad, below the irreversibility threshold) and the human's authority (which is absolute, at and above the threshold).

The doctrine (AGENTS.md Part 3) says: "Do not confuse the apparatus with the work." The security model is apparatus. The work is a player playing One Mortal Morning for an hour and wanting a second hour. The security model exists so that the AI can do the work of building that experience without risking the player's save, the determinism contract, or the project's integrity. The measure of the security model is the same as the measure of the engine: does the player want a second hour, and is their save intact when they come back for it?
