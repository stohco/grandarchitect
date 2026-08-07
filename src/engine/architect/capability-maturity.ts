/**
 * Capability Maturity Ladder
 * ============================
 *
 * Per the auditor's directive, no adapter may set its own production maturity.
 * Maturity is DERIVED from evidence predicates.
 *
 * The word "available" means ONLY:
 *   The capability passed its required acceptance suite in the current
 *   environment and may safely be selected for its approved role.
 *
 * An importable package is not available. It is IMPORTABLE.
 */

export type CapabilityMaturity =
  | 'DISCOVERED'
  | 'PINNED'
  | 'INSTALLED'
  | 'IMPORTABLE'
  | 'INSTANTIATED'
  | 'EXERCISED'
  | 'PIPELINE_CONNECTED'
  | 'WORKFLOW_PROVEN'
  | 'ACCEPTANCE_PASSED'
  | 'PRODUCTION_CANDIDATE'
  | 'VALIDATED'
  | 'BLOCKED'
  | 'REJECTED';

// Extended states for honest sub-classification
export type ExtendedMaturity =
  | CapabilityMaturity
  | 'EXERCISED_ON_TRIVIAL_FIXTURE'
  | 'EXERCISED_ON_FIXTURE'
  | 'SPECIFIED_ONLY'
  | 'HARDCODED_REFERENCE_FIXTURE'
  | 'HEURISTIC_CANDIDATE_EXTRACTOR'
  | 'AUTHORITATIVE_DENIAL_NOT_PROVEN'
  | 'BLOCKED_RUNTIME_INITIALIZATION';

export interface CapabilityClaim {
  claimId: string;
  statement: string;
  requiredEvidence: string[];
  satisfied: boolean;
  evidence: string[];
  blockingReasons: string[];
}

export interface TestRunReference {
  testRunId: string;
  suiteId: string;
  passed: boolean;
  timestamp: string;
  artifacts: string[];
}

export interface ArtifactReference {
  artifactId: string;
  type: string;
  hash: string;
  url?: string;
}

export interface BrowserEvidenceReference {
  browser: 'chromium' | 'firefox' | 'webkit';
  version: string;
  buildSHA: string;
  traceUrl?: string;
  screenshotUrl?: string;
  consoleErrors: number;
  pageErrors: number;
}

export interface FailureEvidenceReference {
  failureTestId: string;
  description: string;
  passed: boolean;
  reason: string;
}

export interface CapabilityEvidenceManifest {
  capabilityId: string;
  providerId: string;
  providerVersion: string;

  sourceRevision: string;
  environmentHash: string;

  claims: CapabilityClaim[];
  acceptanceSuiteId: string;

  testRuns: TestRunReference[];
  artifacts: ArtifactReference[];
  browserEvidence: BrowserEvidenceReference[];
  failureTests: FailureEvidenceReference[];

  currentMaturity: ExtendedMaturity;
  promotionDecision: 'promote' | 'hold' | 'block' | 'reject';

  evaluatedAt: string;
  evaluatorId: string;
}

// ---------------------------------------------------------------------------
// Evidence Predicate System
// ---------------------------------------------------------------------------

export type EvidencePredicate = (manifest: CapabilityEvidenceManifest) => boolean;

export interface MaturityRule {
  targetMaturity: ExtendedMaturity;
  requiredClaims: string[];
  predicate: EvidencePredicate;
}

/**
 * Derive maturity from evidence — NOT from adapter self-reporting.
 *
 * The adapter provides evidence. This function derives the maturity level
 * from that evidence using predicates.
 */
export function deriveMaturity(
  manifest: CapabilityEvidenceManifest,
  rules: MaturityRule[],
): ExtendedMaturity {
  for (const rule of rules) {
    const claimsSatisfied = rule.requiredClaims.every((claimId) => {
      const claim = manifest.claims.find((c) => c.claimId === claimId);
      return claim?.satisfied === true;
    });
    if (claimsSatisfied && rule.predicate(manifest)) {
      return rule.targetMaturity;
    }
  }
  return 'DISCOVERED';
}

// ---------------------------------------------------------------------------
// Rapier Maturity Derivation
// ---------------------------------------------------------------------------

export const RAPIER_MATURITY_RULES: MaturityRule[] = [
  {
    targetMaturity: 'PINNED',
    requiredClaims: ['pinned-version'],
    predicate: (m) => m.providerVersion !== '',
  },
  {
    targetMaturity: 'INSTALLED',
    requiredClaims: ['pinned-version', 'dependency-resolves'],
    predicate: (m) => m.claims.some((c) => c.claimId === 'dependency-resolves' && c.satisfied),
  },
  {
    targetMaturity: 'IMPORTABLE',
    requiredClaims: ['pinned-version', 'dependency-resolves', 'module-import'],
    predicate: (m) => m.claims.some((c) => c.claimId === 'module-import' && c.satisfied),
  },
  {
    targetMaturity: 'INSTANTIATED',
    requiredClaims: ['pinned-version', 'dependency-resolves', 'module-import', 'world-created'],
    predicate: (m) => m.claims.some((c) => c.claimId === 'world-created' && c.satisfied),
  },
  {
    targetMaturity: 'EXERCISED',
    requiredClaims: ['pinned-version', 'dependency-resolves', 'module-import', 'world-created', 'body-collides'],
    predicate: (m) => m.claims.some((c) => c.claimId === 'body-collides' && c.satisfied),
  },
  {
    targetMaturity: 'PIPELINE_CONNECTED',
    requiredClaims: ['pinned-version', 'dependency-resolves', 'module-import', 'world-created', 'body-collides', 'character-workflow'],
    predicate: (m) => m.claims.some((c) => c.claimId === 'character-workflow' && c.satisfied),
  },
  {
    targetMaturity: 'WORKFLOW_PROVEN',
    requiredClaims: [
      'pinned-version', 'dependency-resolves', 'module-import', 'world-created',
      'body-collides', 'character-workflow', 'chromium-and-firefox',
    ],
    predicate: (m) =>
      m.claims.some((c) => c.claimId === 'chromium-and-firefox' && c.satisfied) &&
      m.browserEvidence.length >= 2,
  },
  {
    targetMaturity: 'ACCEPTANCE_PASSED',
    requiredClaims: [
      'pinned-version', 'dependency-resolves', 'module-import', 'world-created',
      'body-collides', 'character-workflow', 'chromium-and-firefox',
      'full-acceptance-suite', 'failure-tests-pass',
    ],
    predicate: (m) =>
      m.claims.some((c) => c.claimId === 'full-acceptance-suite' && c.satisfied) &&
      m.failureTests.length > 0 &&
      m.failureTests.every((f) => f.passed),
  },
];

// ---------------------------------------------------------------------------
// Current Honest Maturity Levels (as of this commit)
// ---------------------------------------------------------------------------

export const CURRENT_MATURITY: Record<string, ExtendedMaturity> = {
  // WORKFLOW_PROVEN (2026-08-07): Rapier embodied playtest acceptance —
  // real KCC character in the shipped viewport, 10/10 acceptance on
  // Chrome + Edge + Firefox (production) and 11/11 dev Chrome/Edge,
  // evidence in evidence/rapier-playtest/. ACCEPTANCE_PASSED remains
  // pending the formal failure-injection suite (dynamic WASM-failure
  // exercise), though the init-error path is code-verified and surfaces
  // visibly via the DOM HUD. Known limitation: Rapier 0.19.3 KCC clips
  // box corners ~0.8m on diagonal approaches (measured, documented).
  rapier: 'WORKFLOW_PROVEN',
  cedar: 'EXERCISED',
  z3: 'BLOCKED_RUNTIME_INITIALIZATION',
  gltfTransform: 'EXERCISED_ON_TRIVIAL_FIXTURE',
  meshoptimizer: 'EXERCISED_ON_TRIVIAL_FIXTURE',
  tilesRenderer: 'IMPORTABLE',
  planningRouter: 'SPECIFIED_ONLY',
  multiSolverPlan: 'HARDCODED_REFERENCE_FIXTURE',
  bibleExtractor: 'HEURISTIC_CANDIDATE_EXTRACTOR',
  persistence: 'EXERCISED',
  playwright: 'EXERCISED',
};

export const MATURITY_DESCRIPTIONS: Record<ExtendedMaturity, string> = {
  DISCOVERED: 'Technology identified but not yet pinned or installed',
  PINNED: 'Exact version and license recorded',
  INSTALLED: 'Dependency resolves locally in node_modules',
  IMPORTABLE: 'Module can be imported without error',
  INSTANTIATED: 'A real core object was constructed (e.g., Rapier World)',
  EXERCISED: 'One real operation succeeded (e.g., body collides with ground)',
  EXERCISED_ON_FIXTURE: 'One real operation succeeded on test fixture data',
  EXERCISED_ON_TRIVIAL_FIXTURE: 'One real operation succeeded on trivial fixture (e.g., cube)',
  PIPELINE_CONNECTED: 'Real project data enters and output returns',
  WORKFLOW_PROVEN: 'A real user-facing workflow uses it end-to-end',
  ACCEPTANCE_PASSED: 'Its full acceptance suite passes including failure tests',
  PRODUCTION_CANDIDATE: 'Failure, performance, persistence, and security tested',
  VALIDATED: 'Approved for authoritative production use',
  BLOCKED: 'Known issue prevents promotion',
  BLOCKED_RUNTIME_INITIALIZATION: 'Runtime cannot initialize — blocked on environment issue',
  REJECTED: 'Evaluated and deliberately not adopted',
  SPECIFIED_ONLY: 'Types/interfaces exist but no implementation',
  HARDCODED_REFERENCE_FIXTURE: 'Returns hardcoded data, not real computation',
  HEURISTIC_CANDIDATE_EXTRACTOR: 'Keyword-based extraction, not semantic compilation',
  AUTHORITATIVE_DENIAL_NOT_PROVEN: 'Works for allows but never proven to deny authoritatively',
};
