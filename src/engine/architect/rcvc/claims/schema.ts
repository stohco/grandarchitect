/**
 * Claim-Level Ground-Truth Record Schema
 *
 * Replaces document-level annotation compliance with per-claim records.
 * Every significant claim in the bible must have a record here.
 *
 * This is the foundation that enables genuine semantic validation —
 * not just marker presence. Each claim has a stable ID, truth level,
 * exact statement, source/provenance, confidence, dependencies, and
 * approval status. The validator can then check relationships BETWEEN
 * claims (semantic graph), not just whether a document contains markers.
 *
 * No forbidden functions. No Three.js, no DOM. Pure data.
 */

// ============================================================================
// Claim record — the atomic unit of ground truth
// ============================================================================

export type TruthLevel = 'CANON' | 'DERIVED' | 'ART' | 'PROC' | 'UNRESOLVED';

export type ApprovalStatus =
  | 'approved'       // user-reviewed and confirmed
  | 'candidate'      // extracted/inferred, pending review
  | 'rejected'       // reviewed and found wrong
  | 'blocked';       // cannot be resolved with current capability

export type Provenance =
  | 'user-approved'       // explicitly decided by the user
  | 'logically-derived'   // follows from other approved claims
  | 'art-directed'        // deliberate visual/experiential choice
  | 'procedural'          // valid range for generated instances
  | 'unresolved'          // not yet established
  | 'script-inserted'     // inserted by a batch script (MUST be audited)
  | 'inferred';           // inferred by AI, not user-reviewed

export type ConfidenceLevel = 'exact' | 'derived' | 'art-directed' | 'estimated';

export interface ClaimRecord {
  /** Stable unique identifier. Format: claim-<domain>-<short-hash>. */
  claimId: string;

  /** The exact claim statement. */
  statement: string;

  /** Truth level — classified per-claim, not per-document. */
  truthLevel: TruthLevel;

  /** Whether this claim has been user-reviewed. */
  approvalStatus: ApprovalStatus;

  /** How the truth level was determined. */
  provenance: Provenance;

  /** Measurement confidence (for claims with physical quantities). */
  confidence?: ConfidenceLevel;

  /** Source document and section. */
  source: {
    doc: string;            // e.g. "04_MORTAL_SUBSTRATE.md"
    section?: string;       // e.g. "§1.1"
    lineRange?: [number, number];
    surroundingText?: string; // ~200 chars of context
  };

  /** Other claim IDs this claim depends on (for semantic graph). */
  dependencies: string[];

  /** Other claim IDs that contradict this claim (if any). */
  contradictions: string[];

  /** Engine systems this claim applies to. */
  applicableSystems: string[];

  /** Physical quantities (if this is a measurement claim). */
  physicalSpec?: {
    dimensions?: Record<string, { min: number; max: number; typical?: number; unit: string }>;
    speedMetersPerSecond?: { min: number; max: number; typical?: number; unit: string };
    massKilograms?: { min: number; max: number; typical?: number; unit: string };
    measurementConfidence: ConfidenceLevel;
    rationale: string;
  };

  /** Domain category for grouping. */
  domain: ClaimDomain;

  /** Tags for filtering/searching. */
  tags: string[];

  /** When this record was created. */
  createdAt: string;

  /** When this record was last reviewed. */
  reviewedAt?: string;

  /** Who/what created this record. */
  createdBy: 'user' | 'extractor-script' | 'architect' | 'imported';

  /** Reviewer notes (if reviewed). */
  reviewNotes?: string;
}

export type ClaimDomain =
  | 'cosmology'
  | 'cultivation'
  | 'combat'
  | 'ecology'
  | 'economy'
  | 'architecture'
  | 'geography'
  | 'history'
  | 'narrative'
  | 'character'
  | 'creature'
  | 'technique'
  | 'formation'
  | 'material'
  | 'culture'
  | 'physics'
  | 'engine'
  | 'measurement'
  | 'governance'
  | 'other';

// ============================================================================
// Claim registry — the collection of all claim records
// ============================================================================

export interface ClaimRegistry {
  version: string;
  generatedAt: string;
  claims: ClaimRecord[];
  summary: ClaimRegistrySummary;
}

export interface ClaimRegistrySummary {
  totalClaims: number;
  byTruthLevel: Record<TruthLevel, number>;
  byApprovalStatus: Record<ApprovalStatus, number>;
  byProvenance: Record<Provenance, number>;
  byDomain: Partial<Record<ClaimDomain, number>>;
  highRiskUnreviewed: number;  // script-inserted CANON claims not yet reviewed
}

// ============================================================================
// Block-type markers — for spec docs so examples don't trigger validators
// ============================================================================

export type BlockType =
  | 'normative_claim'      // a real rule the engine must follow
  | 'valid_example'        // a correct example
  | 'invalid_example'      // an intentionally wrong example (test fixture)
  | 'definition'           // defining a term
  | 'rationale'            // explaining why
  | 'unresolved_question'  // an open question
  | 'prose'                // general narrative text
  | 'machine_readable';    // JSON/code block

export interface BlockMarker {
  blockType: BlockType;
  /** For invalid_example: the contradiction type this example demonstrates. */
  expectedViolation?: string;
  /** The claim text. */
  text: string;
  /** Source location. */
  source: { doc: string; section?: string };
}

// ============================================================================
// Claim-level validation result
// ============================================================================

export interface ClaimValidationReport {
  totalClaims: number;
  claimsReviewed: number;
  findings: ClaimValidationFinding[];
  summary: {
    highRiskUnreviewed: number;
    contradictoryClaims: number;
    unsupportedCanon: number;       // CANON claims with script-inserted provenance
    missingDependencies: number;    // claims that reference non-existent IDs
    orphanClaims: number;           // claims no other claim depends on
  };
  verdict: 'pass' | 'warnings' | 'fail';
  coverage: {
    layersImplemented: string[];
    layersNotImplemented: string[];
  };
}

export interface ClaimValidationFinding {
  claimId: string;
  findingType: ClaimFindingType;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  details?: string;
}

export type ClaimFindingType =
  | 'unsupported-canon'           // CANON claim with script-inserted or inferred provenance
  | 'contradictory-claims'        // two claims that contradict each other
  | 'missing-dependency'          // references a non-existent claim ID
  | 'unreviewed-high-risk'        // script-inserted CANON not yet reviewed
  | 'missing-source'              // no source document specified
  | 'missing-physical-spec'       // measurement claim without physicalSpec
  | 'orphan-claim'                // no other claim depends on this
  | 'circular-dependency'         // dependency cycle detected
  | 'domain-mismatch';            // claim domain doesn't match its content

// ============================================================================
// Helpers
// ============================================================================

export function emptyRegistrySummary(): ClaimRegistrySummary {
  return {
    totalClaims: 0,
    byTruthLevel: { CANON: 0, DERIVED: 0, ART: 0, PROC: 0, UNRESOLVED: 0 },
    byApprovalStatus: { approved: 0, candidate: 0, rejected: 0, blocked: 0 },
    byProvenance: {
      'user-approved': 0,
      'logically-derived': 0,
      'art-directed': 0,
      procedural: 0,
      unresolved: 0,
      'script-inserted': 0,
      inferred: 0,
    },
    byDomain: {},
    highRiskUnreviewed: 0,
  };
}

export function computeSummary(claims: ClaimRecord[]): ClaimRegistrySummary {
  const summary = emptyRegistrySummary();
  summary.totalClaims = claims.length;

  for (const claim of claims) {
    summary.byTruthLevel[claim.truthLevel]++;
    summary.byApprovalStatus[claim.approvalStatus]++;
    summary.byProvenance[claim.provenance]++;

    const domainCount = summary.byDomain[claim.domain] ?? 0;
    summary.byDomain[claim.domain] = domainCount + 1;

    // High-risk: script-inserted CANON that hasn't been reviewed
    if (
      claim.truthLevel === 'CANON' &&
      claim.provenance === 'script-inserted' &&
      claim.approvalStatus !== 'approved'
    ) {
      summary.highRiskUnreviewed++;
    }
  }

  return summary;
}
