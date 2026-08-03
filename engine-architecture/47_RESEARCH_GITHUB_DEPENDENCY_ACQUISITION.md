# 47 — Research, GitHub & Dependency Acquisition

**Status:** Architecture. The controlled research broker through which the AI finds, evaluates, and adopts external work.
**Date:** 2026-08-03
**Engine:** Grand Architect (browser-native plugin host, deterministic contract)
**Depends on:** `04_DEPENDENCY_RESOLUTION_COMPATIBILITY` (the dependency model), `35_MODDING_UNTRUSTED_CONTENT` (untrusted code sandbox), `43_GRAND_ARCHITECT_CONTROL_PLANE` (the Researcher role), `44_ARCHITECT_TOOL_RESOURCE_PROTOCOL` (Research tools registered through IAP), `48_AI_PERMISSIONS_SECURITY_AUDIT` (dependency import is an approval-gated action)
**Read with:** `46_AUTONOMOUS_CHANGE_VALIDATION_PROMOTION` (research candidates feed the validation pipeline), `49_MACHINE_READABLE_CAPABILITY_DECISION_GRAPH` (capability gaps trigger research)

---

## 0. What this document is

The engine is not built from scratch. Every subsystem — the renderer (Three.js), the physics solver (Jolt), the RNG (xoshiro256\*\*), the determinism stack (CBOR, SHA-256), the animation runtime, the VFX runtime — is built on prior art, much of it shipped as open-source libraries. The doctrine (AGENTS.md Part 1) says: "Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason." The doctrine also says (Part 3): "Engage the primary source, not the secondary summary." The research broker is the structural enforcement of both: the AI does not reimplement what exists, and the AI does not adopt a library on the basis of a README summary — it inspects the primary source (the code, the issues, the license, the test suite) before recommending adoption.

This document defines the **research broker**: the controlled path through which the AI searches docs, papers, and GitHub; inspects candidates against nine dimensions; ranks them; clones them to a research sandbox; builds a proof of concept; benchmarks; and chooses among five outcomes (adopt as dependency, write an adapter, port the algorithm, reimplement from scratch, or reject). The ResearchCandidate interface (section 4) is the typed record of the inspection. Licensing is a hard gate (section 6) — a candidate with an incompatible license is rejected, full stop, regardless of how well it fits.

The doctrine (AGENTS.md Part 3) says: "Make decisions; do not defer in the name of rigor." The research broker does not preserve every option forever. It produces a decision: adopt, adapt, port, reimplement, or reject, with a reason. The decision is recorded in the architectural decision ledger (doc 49 §3) and becomes precedent for future research.

---

## 1. The research broker

The research broker is a service that runs alongside the Architect Gateway (doc 43 §3). It is the only path through which the AI may search external sources, clone external repositories, or evaluate external code. Direct network access from the AI is forbidden by the Gateway's network policy (doc 48 §2); the broker is the single chokepoint.

```
┌────────────────────────────────────────────────────────────────────────┐
│                  THE RESEARCH BROKER                                   │
│                                                                        │
│   ┌──────────────┐                                                    │
│   │  AI (Re-     │  "I have a capability gap: I need a deterministic  │
│   │  searcher    │  RNG with streams and substreams."                 │
│   │  role)       │                                                    │
│   └──────┬───────┘                                                    │
│          │  research.findCandidates(gap)                              │
│          v                                                            │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  RESEARCH BROKER                                          │       │
│   │   • searches docs (web), papers (arxiv, semantic scholar) │       │
│   │   • searches GitHub (REST + GraphQL)                      │       │
│   │   • searches the engine's own bible (corpus docs)         │       │
│   │   • returns ResearchCandidate[] (section 4)               │       │
│   └──────────────────────────────────────────────────────────┘       │
│          │                                                            │
│          │  research.inspect(candidate) → enriched candidate          │
│          v                                                            │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  INSPECT (9 dimensions, section 3)                        │       │
│   │   algorithm, architecture, maintenance, dependencies,     │       │
│   │   browser compat, license, perf, issues, security         │       │
│   └──────────────────────────────────────────────────────────┘       │
│          │                                                            │
│          │  research.cloneAndPoc(candidate) → PocReport             │
│          v                                                            │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  RESEARCH SANDBOX                                          │       │
│   │   • isolated from the engine's main process               │       │
│   │   • the candidate is cloned, built, and run                │       │
│   │   • a proof-of-concept integration is built                │       │
│   │   • benchmarked against the engine's needs                 │       │
│   └──────────────────────────────────────────────────────────┘       │
│          │                                                            │
│          │  research.decide(candidate, PocReport) → Decision         │
│          v                                                            │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │  DECISION (5 outcomes, section 5)                         │       │
│   │   adopt | adapter | port | reimplement | reject           │       │
│   └──────────────────────────────────────────────────────────┘       │
│          │                                                            │
│          v                                                            │
│   recorded in the architectural decision ledger (doc 49 §3)          │
└────────────────────────────────────────────────────────────────────────┘
```

```typescript
interface ResearchBroker {
  /** Find candidates for a capability gap. */
  findCandidates(gap: CapabilityGap): Promise<ResearchCandidate[]>;
  /** Deepen the inspection of a candidate. */
  inspect(candidate: ResearchCandidate): Promise<ResearchCandidate>;
  /** Clone the candidate to the research sandbox and build a PoC. */
  cloneAndPoc(candidate: ResearchCandidate, spec: PocSpec): Promise<PocReport>;
  /** Decide among the five outcomes. */
  decide(candidate: ResearchCandidate, poc: PocReport): Promise<ResearchDecision>;
  /** Query the broker's history (what was researched, what was decided). */
  history(filter: ResearchHistoryFilter): Promise<ResearchDecision[]>;
}
```

---

## 2. The research flow

The research flow is the canonical sequence: **gap detected → search → find candidates → inspect → rank → clone → PoC → benchmark → choose → record**. Each step is a tool call (or a sequence of tool calls) registered in the IAP tool registry (doc 44 §2). The flow is audited end-to-end.

### 2.1 Gap detection

Research begins with a capability gap. A capability gap is the difference between a desired capability (doc 49 §1 — the `CapabilityRequirement` interface) and the currently implemented capability graph. The AI does not research "interesting things"; it researches gaps.

```typescript
interface CapabilityGap {
  /** The CapabilityRequirement that is not satisfied. */
  requirementId: string;
  /** What is missing, in one sentence. */
  description: string;
  /** What the AI has already tried (internal solutions). */
  attemptedInternally: string[];
  /** Why an external solution is being considered. */
  whyExternal: 'no-internal-expertise' | 'faster-to-adopt' | 'standard-practice' | 'novel-algorithm';
  /** The constraints the solution must meet. */
  constraints: {
    browserCompat: 'webgpu' | 'webgl2' | 'webworker' | 'main-thread';
    determinismRequired: boolean;
    performanceBudget?: PerformanceBudget;
    licenseAllowlist: string[];  // e.g. ['MIT', 'Apache-2.0', 'BSD-2-Clause']
  };
}
```

### 2.2 Search

The broker searches three sources:

1. **The engine's own bible** (corpus docs). Has this gap been addressed in the design corpus? Is there an architectural decision that settled it? Has a previous research round rejected a candidate for this gap? (The broker queries the World Oracle, doc 49 §4.)
2. **Documentation and papers.** Web search (doc-search), arxiv, semantic scholar. The broker looks for primary sources, not summaries (per the doctrine: "Engage the primary source, not the secondary summary").
3. **GitHub.** REST + GraphQL search. The broker queries by topic, by language (TypeScript, Rust→WASM, C++→WASM), by license, by stars (a heuristic for maintenance, not a decision criterion), and by recency of last commit.

```typescript
interface ResearchSearchParams {
  gap: CapabilityGap;
  /** Which sources to search. Default: all three. */
  sources?: ('bible' | 'web' | 'github')[];
  /** Max candidates to return. Default: 20. */
  maxCandidates?: number;
  /** Min stars (GitHub heuristic). Default: 50. */
  minStars?: number;
  /** License allowlist, inherited from the gap. */
  licenseAllowlist: string[];
}

interface ResearchSearchResult {
  candidates: ResearchCandidate[];
  /** The queries that were run, for audit. */
  queries: { source: string; query: string; resultCount: number }[];
  /** Candidates that were filtered out, with reasons. */
  filtered: { candidateRef: string; reason: string }[];
}
```

### 2.3 Find candidates

Each search result becomes a `ResearchCandidate` (section 4). The initial candidate is shallow — just enough to decide whether to inspect further. The deep inspection (section 2.4) enriches the candidate.

### 2.4 Inspect (nine dimensions)

Every candidate that survives the initial filter is inspected against nine dimensions. The inspection is the structural enforcement of "engage the primary source." The broker does not read the README and call it done; it reads the code, the issues, the test suite, the dependency tree, the license file, the security advisories.

```typescript
interface CandidateInspection {
  algorithm: AlgorithmInspection;
  architecture: ArchitectureInspection;
  maintenance: MaintenanceInspection;
  dependencies: DependencyInspection;
  browserCompat: BrowserCompatInspection;
  license: LicenseInspection;
  performance: PerformanceInspection;
  issues: IssueInspection;
  security: SecurityInspection;
}

interface AlgorithmInspection {
  /** What algorithm does it implement? */
  algorithm: string;
  /** Complexity class. */
  complexity: { time: string; space: string };
  /** Is it deterministic? */
  deterministic: boolean;
  /** Primary source (paper, textbook, prior art). */
  primarySource: { kind: 'paper' | 'textbook' | 'prior-art'; ref: string };
  /** Whether the algorithm matches the engine's needs. */
  matchesNeed: boolean;
  mismatches: string[];  // e.g. "requires floating-point, but engine uses fixed-point"
}

interface ArchitectureInspection {
  /** What's the API surface? */
  api: string;  // a summary
  /** What are the entry points? */
  entryPoints: string[];
  /** What state does it hold? */
  stateful: boolean;
  /** How does it fit the plugin model? */
  pluginFit: 'native' | 'adapter-required' | 'wrapper-required' | 'poor';
  fitNotes: string;
}

interface MaintenanceInspection {
  lastCommit: string;  // ISO date
  commitFrequency: string;  // e.g. "weekly", "monthly", "yearly"
  openIssueCount: number;
  closedIssueCount: number;
  /** Ratio of closed to opened, last 90 days. */
  issueCloseRate: number;
  maintainerCount: number;
  /** Whether the maintainer is responsive. */
  responsiveMaintainer: boolean;
  /** Risk assessment. */
  risk: 'low' | 'med' | 'high';
  riskNotes: string;
}

interface DependencyInspection {
  /** The transitive dependency count. */
  transitiveCount: number;
  /** The dependency tree (top 10). */
  tree: { name: string; version: string; license: string }[];
  /** Any dependencies that conflict with the engine's existing deps. */
  conflicts: { name: string; reason: string }[];
  /** Any dependencies that are themselves unmaintained. */
  unmaintainedDeps: string[];
}

interface BrowserCompatInspection {
  /** Which browser APIs does it use? */
  browserApis: string[];
  /** Does it require Node? */
  requiresNode: boolean;
  /** Does it require WASM? */
  requiresWasm: boolean;
  /** Does it require WebGPU? */
  requiresWebgpu: boolean;
  /** Does it work in a Web Worker? */
  workerCompatible: boolean;
  /** Tested browsers (from CI). */
  testedBrowsers: string[];
  /** Whether it works in the engine's target browsers. */
  compatibleWithEngine: boolean;
  compatNotes: string;
}

interface LicenseInspection {
  /** The license (SPDX identifier). */
  license: string;
  /** Is it in the gap's allowlist? */
  allowlisted: boolean;
  /** Are there contributor license agreements? */
  cla: boolean;
  /** Any license ambiguities (e.g. transitive dep with unclear license). */
  ambiguities: string[];
  /** The license file's hash, for audit. */
  licenseFileHash: string;
}

interface PerformanceInspection {
  /** Benchmarks the candidate ships. */
  shippedBenchmarks: string[];
  /** The broker's own benchmark (from the PoC, section 2.6). */
  brokerBenchmark?: BenchmarkResult;
  /** Whether it meets the gap's performance budget. */
  meetsBudget: boolean;
  perfNotes: string;
}

interface IssueInspection {
  /** Open issues, categorized. */
  openIssues: { category: 'bug' | 'feature' | 'security' | 'docs' | 'other'; count: number }[];
  /** Recent issue trends (increasing, stable, decreasing). */
  trend: 'increasing' | 'stable' | 'decreasing';
  /** Any issues that match the engine's intended use. */
  relevantOpenIssues: { number: number; title: string; severity: 'low' | 'med' | 'high' }[];
}

interface SecurityInspection {
  /** Known CVEs (from the GitHub security advisories API). */
  cves: { id: string; severity: 'low' | 'med' | 'high' | 'critical'; fixed: boolean }[];
  /** Whether the code uses eval, Function, or dynamic import. */
  dynamicCode: boolean;
  /** Whether the code makes network requests. */
  networkAccess: boolean;
  /** Whether the code accesses the filesystem. */
  filesystemAccess: boolean;
  /** The SecurityReviewer's signed assessment. */
  securityReview: { reviewer: string; signedAt: string; assessment: 'pass' | 'conditional' | 'fail'; notes: string };
}
```

### 2.5 Rank

After inspection, candidates are ranked. The ranking is a weighted score across the nine dimensions, with the gap's constraints applied as hard filters (a candidate with the wrong license is ranked 0, regardless of other strengths).

```typescript
interface CandidateRanking {
  candidate: ResearchCandidate;
  score: number;  // 0..100
  /** The weighted contributions to the score. */
  contributions: { dimension: string; score: number; weight: number; contribution: number }[];
  /** Whether the candidate passed the hard filters. */
  passedHardFilters: boolean;
  /** The hard filter failures, if any. */
  hardFilterFailures: string[];
}
```

The default weights bias toward: license (hard gate), browser compat (hard gate), determinism (hard gate if required), then maintenance (20%), architectural fit (20%), performance (15%), security (15%), algorithm correctness (10%), issue health (10%), dependencies (10%). The weights are per-gap; a gap that prioritizes performance may re-weight.

### 2.6 Clone to research sandbox and build PoC

The top-ranked candidates (default: top 3) are cloned to the **research sandbox** — an isolated process with no network access (the broker pre-fetches all dependencies before severing the network), no filesystem access outside its working directory, and no access to the engine's main process. In the sandbox, the broker:

1. Builds the candidate from source.
2. Runs the candidate's own test suite.
3. Builds a **proof of concept** integration with the engine — the smallest end-to-end thing that exercises the candidate against the gap.
4. Benchmarks the PoC against the gap's performance budget.
5. Verifies determinism (if the gap requires it) by running the PoC twice and comparing hashes.

```typescript
interface PocSpec {
  candidate: ResearchCandidate;
  /** The PoC scenario — the smallest thing that exercises the candidate. */
  scenario: string;
  /** The performance budget. */
  perfBudget: PerformanceBudget;
  /** Whether to verify determinism. */
  verifyDeterminism: boolean;
}

interface PocReport {
  candidate: ResearchCandidate;
  /** Whether the candidate built. */
  built: boolean;
  buildErrors?: string[];
  /** Whether the candidate's tests passed. */
  testsPassed: boolean;
  testFailures?: string[];
  /** Whether the PoC integration worked. */
  pocWorked: boolean;
  pocNotes: string;
  /** The benchmark results. */
  benchmark: BenchmarkResult;
  /** The determinism verification, if requested. */
  determinism?: { matched: boolean; hashBefore: string; hashAfter: string };
  /** Any issues the PoC surfaced. */
  issuesFound: string[];
  /** The cost. */
  cost: { wallMs: number; cpuMs: number };
}
```

### 2.7 Choose

The decision is one of five outcomes:

```typescript
type ResearchOutcome =
  | { kind: 'adopt'; dependency: DependencyDeclaration; integrationPlan: IntegrationPlan }
  | { kind: 'adapter'; adapterPlugin: PluginId; integrationPlan: IntegrationPlan }
  | { kind: 'port'; portedPlugin: PluginId; sourceRef: string; integrationPlan: IntegrationPlan }
  | { kind: 'reimplement'; spec: ReimplementationSpec; reason: string }
  | { kind: 'reject'; reason: string };

interface ResearchDecision {
  decisionId: string;
  gap: CapabilityGap;
  candidatesConsidered: ResearchCandidate[];
  /** The chosen candidate, if any. */
  chosen?: ResearchCandidate;
  outcome: ResearchOutcome;
  /** The decision reason, first-person signed. */
  decisionReason: string;
  /** The decider (Researcher role + Reviewer signature). */
  decider: { role: ArchitectRole; principalId: string; signedAt: string };
  reviewer: { role: ArchitectRole; principalId: string; signedAt: string };
  /** References to the architectural decision ledger (doc 49 §3). */
  ledgerRef: string;
}
```

The five outcomes:

- **Adopt.** The candidate is added as a direct dependency. Used when the candidate is well-maintained, browser-compatible, correctly licensed, and architecturally native.
- **Adapter.** The candidate is wrapped in an adapter plugin. Used when the candidate is good but its API does not match the engine's plugin model.
- **Port.** The candidate's algorithm is ported into a new plugin, with attribution. Used when the candidate is unmaintained, has an incompatible dependency, or must be modified for determinism.
- **Reimplement.** The candidate is studied but not used; the engine implements its own version. Used when no candidate meets the constraints, or when the algorithm is simple enough that a clean-room implementation is preferable to a dependency.
- **Reject.** The gap is not addressed. Used when no candidate is acceptable and reimplementing is not justified; the gap is recorded as "open" in the decision ledger.

---

## 3. The nine inspection dimensions, in detail

The nine dimensions were introduced in section 2.4. Here is why each is non-negotiable.

### 3.1 Algorithm

The doctrine (AGENTS.md Part 3) says: "Engage the primary source, not the secondary summary." The algorithm inspection requires the AI to identify the algorithm and cite its primary source (paper, textbook, prior art). A candidate that cannot identify its own algorithm — "it's just some code that works" — is a candidate the AI cannot trust to be deterministic, performant, or correct in edge cases.

### 3.2 Architecture

The architectural fit inspection is the difference between "it works in isolation" and "it works in the engine." A candidate that holds global state, requires a specific event loop, or has a non-deterministic API surface will fight the engine's plugin model (doc 03). The `pluginFit` field records the verdict: native, adapter-required, wrapper-required, or poor.

### 3.3 Maintenance

A dependency the engine adopts is a dependency the engine maintains, in practice. If the upstream maintainer abandons the project, the engine team (human or AI) inherits the maintenance burden. The maintenance inspection surfaces this risk explicitly: last commit, commit frequency, issue close rate, maintainer count. A candidate with one maintainer who has not committed in two years is high-risk, regardless of how good the code is.

### 3.4 Dependencies

A candidate's own dependencies are the engine's dependencies. The transitive dependency count, the conflicts with the engine's existing deps, and the unmaintained sub-dependencies are all load-bearing. The doctrine (AGENTS.md Part 1) says: "Lean on the dependencies already in the project before writing your own implementation or adding packages." The dependency inspection enforces this — a candidate that adds 50 transitive deps to solve a problem the engine's existing deps solve is rejected.

### 3.5 Browser compatibility

The engine is browser-native. A candidate that requires Node, requires native modules, or uses browser APIs the engine does not support is incompatible. The browser compat inspection is a hard filter — a candidate that fails it cannot be adopted (though it may be ported).

### 3.6 License

Licensing is a **hard gate** (section 6). A candidate with an incompatible license is rejected, regardless of how well it fits. The license inspection is non-negotiable because the consequences of a license violation are legal, not technical.

### 3.7 Performance

A candidate that is algorithmically correct but 10x slower than the engine's budget is useless. The performance inspection combines the candidate's shipped benchmarks (which may be misleading) with the broker's own benchmark from the PoC (which is calibrated against the engine's needs).

### 3.8 Issues

The issue inspection surfaces what the community has already found. A candidate with 200 open bug issues is a candidate with 200 known problems; the engine will inherit them. The `relevantOpenIssues` field calls out issues that match the engine's intended use — these are the issues the engine will hit first.

### 3.9 Security

The security inspection is the SecurityReviewer role's signed assessment. It covers known CVEs, dynamic code usage (eval, Function, dynamic import), network access, filesystem access, and any other surface a malicious or compromised dependency could exploit. The doctrine (AGENTS.md Part 3) says: "Police historical derivation as rigorously as literary derivation." A dependency is derivation; it must be audited as rigorously as code the engine writes itself.

---

## 4. The ResearchCandidate interface

```typescript
interface ResearchCandidate {
  candidateId: string;
  /** The repository, if GitHub. */
  repository?: {
    url: string;
    owner: string;
    name: string;
    stars: number;
    forks: number;
    defaultBranch: string;
    lastCommit: string;
  };
  /** The paper, if from arxiv/semantic scholar. */
  paper?: {
    title: string;
    authors: string[];
    arxivId?: string;
    doi?: string;
    abstract: string;
  };
  /** The bible reference, if from the engine's corpus. */
  bibleRef?: string;

  /** What this candidate is for, in one sentence. */
  purpose: string;
  /** The license (SPDX). */
  license: string;
  /** Whether it's in the gap's allowlist. */
  licenseAllowlisted: boolean;
  /** Whether it's browser-compatible. */
  browserCompat: BrowserCompatInspection;
  /** Architectural fit. */
  architecturalFit: ArchitectureInspection;
  /** Maintenance risk. */
  maintenanceRisk: MaintenanceInspection;
  /** Security assessment. */
  securityAssessment: SecurityInspection;
  /** Benchmark results (from the PoC). */
  benchmarkResults?: BenchmarkResult;
  /** The integration strategy (one of the 5 outcomes). */
  integrationStrategy: 'adopt' | 'adapter' | 'port' | 'reimplement' | 'reject' | 'undecided';
  /** Source references (the primary sources cited). */
  sourceReferences: { kind: 'paper' | 'textbook' | 'prior-art' | 'repo' | 'issue'; ref: string }[];
  /** The decision reason, when the candidate is chosen or rejected. */
  decisionReason?: string;
}
```

---

## 5. The five outcomes, in detail

### 5.1 Adopt

The candidate is added to `package.json` (or the engine's equivalent). The integration plan specifies: which plugin wraps it, which capability it provides, what the determinism fingerprint impact is, what the migration path is for saves that predate the adoption.

### 5.2 Adapter

The candidate is wrapped in an adapter plugin. The adapter translates the candidate's API to the engine's plugin model; the candidate is otherwise unchanged. Used when the candidate is good but its API does not match.

### 5.3 Port

The candidate's algorithm is ported into a new plugin, with attribution (the `sourceRef` field records the upstream commit, the license, the attribution). Used when the candidate is unmaintained, has an incompatible dependency, or must be modified for determinism.

### 5.4 Reimplement

The candidate is studied but not used; the engine implements its own version. Used when no candidate meets the constraints, or when the algorithm is simple enough that a clean-room implementation is preferable to a dependency. The doctrine (AGENTS.md Part 1) says: "Do not reimplement common functionality without a clear reason." Reimplementing is the outcome of last resort, with a documented reason.

### 5.5 Reject

The gap is not addressed. The decision ledger records the gap as "open" with the candidates considered and the reasons for rejection. Future research rounds may revisit the gap if new candidates emerge.

---

## 6. Licensing as a hard gate

Licensing is the only dimension that is a **hard gate** rather than a scored dimension. A candidate with a license not in the gap's allowlist is rejected, full stop, regardless of how well it scores on the other eight dimensions. The allowlist is per-gap; the engine's default allowlist is `['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD']`.

```typescript
const DEFAULT_LICENSE_ALLOWLIST = [
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD',
];

function licenseGate(candidate: ResearchCandidate, allowlist: string[]): { passed: boolean; reason: string } {
  if (!allowlist.includes(candidate.license)) {
    return {
      passed: false,
      reason: `License ${candidate.license} is not in the allowlist [${allowlist.join(', ')}].`,
    };
  }
  if (candidate.securityAssessment.assessment === 'fail') {
    return {
      passed: false,
      reason: `Security assessment failed: ${candidate.securityAssessment.securityReview.notes}`,
    };
  }
  return { passed: true, reason: 'ok' };
}
```

### 6.1 Why a hard gate

Licensing violations are legal, not technical. A candidate that is technically perfect but licensed under GPL cannot be adopted into a permissively-licensed engine without relicensing the engine. The AI does not get to make this trade-off; the hard gate enforces it. The doctrine (AGENTS.md Part 3) says: "Confront the central tension directly." The tension between "this candidate is great" and "this candidate's license is incompatible" is confronted by rejecting the candidate, not by hoping the license issue goes away.

### 6.2 The GPL question

GPL-licensed candidates are not in the default allowlist. This is a deliberate choice: the engine is permissively licensed (MIT), and adopting GPL code would force the engine to relicensed. The AI may propose to use GPL code under specific circumstances (e.g., a separate, optional plugin), but that proposal requires human approval and a documented license review.

### 6.3 The "license is unclear" case

A candidate whose license file is ambiguous (e.g., a README says "MIT" but there is no LICENSE file, or the LICENSE file is a modified MIT with extra clauses) is treated as `license: 'unclear'`, which fails the gate. The AI may escalate to a human for a license review; the human's decision is recorded in the decision ledger.

---

## 7. Failure cases

| Failure | Detection | Response |
|---|---|---|
| Search returns no candidates | Empty result | The broker reports `no-candidates`; the AI may broaden the search, escalate, or proceed to reimplement |
| Candidate cannot be cloned | Network or auth error | The candidate is dropped from the ranking; the broker notes the failure |
| Candidate cannot be built | Build error in the sandbox | The PoC fails; the candidate is dropped or marked for `port`/`reimplement` |
| Candidate's tests fail | Test runner | The PoC reports the failures; the candidate is dropped or marked for `port` |
| PoC reveals non-determinism | Hash mismatch | If the gap requires determinism, the candidate is rejected; if not, the candidate is marked for `adapter` with a determinism wrapper |
| PoC reveals a security issue | SecurityReviewer | The candidate is rejected; the issue is recorded in the decision ledger |
| License is incompatible | License gate | The candidate is rejected, regardless of other scores |
| All top candidates rejected | All outcomes fail | The broker reports `all-rejected`; the AI may reimplement, escalate, or shelve the gap |
| Research budget exceeded | Budget check | The broker stops; the AI escalates for more budget or proceeds with the best partial result |
| Network access from sandbox | Network policy | The broker refuses the call; the sandbox has no network by design |

---

## 8. Rejected alternatives

### 8.1 "The AI can search the web freely"

The first design: the AI has unrestricted web access, runs searches, reads pages, decides. Rejected because (a) unrestricted web access is an exfiltration vector — a compromised AI could leak the engine's source or the player's save through search queries; (b) the AI's searches are unaudited without a broker, breaking the audit story; (c) the doctrine (AGENTS.md Part 3) says: "Engage the primary source, not the secondary summary." The broker enforces this — it queries the primary sources (GitHub, arxiv, the bible) and records what it queried. Free web access produces research built on secondary summaries, which the doctrine forbids.

### 8.2 "The AI can install any npm package"

The second design: the AI runs `npm install` directly. Rejected because (a) npm packages are not inspected by the broker's nine dimensions; (b) npm packages can install postinstall scripts that run arbitrary code; (c) the engine's determinism contract (doc 06) requires that every dependency be content-addressed and fingerprint-affecting; arbitrary npm installs break this. The broker is the only path; npm installs happen in the research sandbox, under the broker's control.

### 8.3 "License is a scored dimension, not a hard gate"

The third design: license is one of nine scored dimensions, weighted equally. Rejected because licensing is not a trade-off — a GPL-licensed candidate cannot be adopted into an MIT-licensed engine, period. Treating it as scored implies the AI could choose to adopt a GPL candidate if its other scores were high enough, which is a legal error. The hard gate makes the legal constraint structural.

### 8.4 "Skip the PoC for well-known libraries"

The fourth design: candidates with >10k stars skip the PoC; their reputation is sufficient. Rejected because (a) stars are a popularity heuristic, not a quality or compatibility heuristic; (b) the PoC is the structural enforcement of "engages the primary source" — without it, the broker is relying on the README, which the doctrine forbids; (c) well-known libraries have well-known bugs that the PoC surfaces. The PoC is required for every candidate, full stop.

### 8.5 "Reimplement is the default"

The fifth design: the AI defaults to reimplementing, on the theory that the engine's code is more trustworthy than external code. Rejected because (a) the doctrine (AGENTS.md Part 1) explicitly says: "Do not reimplement common functionality without a clear reason"; (b) reimplementing is the outcome of last resort, with a documented reason; (c) the engine does not have the expertise to reimplement every domain well (physics, animation, VFX are deep fields with deep prior art). The default is adopt; reimplement is the exception.

### 8.6 "All five outcomes require human approval"

The sixth design: every research decision (adopt, adapter, port, reimplement, reject) requires human approval. Rejected because (a) it makes the AI useless — every gap blocks on a human; (b) the doctrine (AGENTS.md Part 3) says: "Authorize the smallest end-to-end thing that works." The smallest end-to-end thing is the AI researching, deciding, and recording, with human approval only at the point where the decision becomes load-bearing (i.e., when the candidate is adopted as a dependency that ships to players). The Architect role approves at lower autonomy; the human approves at Integrate and Release.

---

## 9. What this document enables

The research broker as specified here enables the AI to:

- **Find** external work that addresses a capability gap (section 2.2).
- **Inspect** candidates against nine dimensions, with the primary source as the authority (section 2.4).
- **Rank** candidates by weighted score, with hard filters for license, browser compat, and determinism (section 2.5).
- **Prove** the candidate works in the engine's context, with a PoC and a benchmark (section 2.6).
- **Decide** among five outcomes, with a first-person signed reason (section 2.7).
- **Record** the decision in the architectural decision ledger, as precedent for future research (doc 49 §3).

The doctrine (AGENTS.md Part 3) says: "Cite the precedent; do not float above it." The research broker is the structural enforcement of that doctrine for external work. Every adoption cites the candidate, the inspection, the PoC, and the decision. Every rejection cites the reason. The decision ledger is the precedent the next research round consults before it starts — so the engine does not re-litigate settled questions, and so the engine's external dependencies are auditable, attributable, and aligned with the doctrine.
