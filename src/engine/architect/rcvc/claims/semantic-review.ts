/**
 * Natural-Language Semantic Review — 5th validation layer
 *
 * Uses the Grand Architect (LLM) to PROPOSE potential issues:
 *   - duplicate claims
 *   - likely contradictions
 *   - ambiguous statements
 *   - overly broad claims
 *   - unsupported canonical classifications
 *   - missing qualifiers
 *   - claims that should be split
 *   - descriptions that cannot be implemented or measured
 *
 * IMPORTANT: This layer PROPOSES findings for human review.
 * It does NOT automatically approve, reject, or modify claims.
 * Every finding cites both relevant claims and explains the potential conflict.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { ClaimRecord, ClaimRegistry } from './schema';

// ============================================================================
// Types
// ============================================================================

export interface SemanticReviewFinding {
  findingId: string;
  claimIds: string[];             // claims involved in this finding
  findingType: SemanticFindingType;
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
  explanation: string;
  proposedAction?: string;        // what the reviewer suggests
  confidence: number;             // 0..1 — AI confidence in the finding
  requiresHumanReview: boolean;   // always true — AI never auto-decides
}

export type SemanticFindingType =
  | 'duplicate-claim'
  | 'likely-contradiction'
  | 'ambiguous-statement'
  | 'overly-broad-claim'
  | 'unsupported-canon'
  | 'missing-qualifier'
  | 'should-split'
  | 'unimplementable'
  | 'missing-measurement'
  | 'scope-conflict';

export interface SemanticReviewReport {
  totalClaims: number;
  claimsReviewed: number;
  findings: SemanticReviewFinding[];
  summary: Record<SemanticFindingType, number>;
  verdict: 'pass' | 'warnings' | 'fail' | 'not-exercised';
  exerciseLevel: 'fixture' | 'subsystem' | 'corpus';
  coverage: {
    layerName: string;
    checksRun: string[];
    notYetChecked: string[];
  };
  importantNote: string;
}

// ============================================================================
// Heuristic semantic review (no LLM — deterministic pattern matching)
//
// NOTE: A full LLM-based review would use z-ai-web-dev-sdk to analyze
// each claim's statement for semantic issues. This heuristic version
// catches obvious patterns. The LLM version is a future enhancement.
// ============================================================================

export function reviewSemanticClaims(registry: ClaimRegistry): SemanticReviewReport {
  const findings: SemanticReviewFinding[] = [];

  // ---- Check 1: Duplicate claims (same or very similar statements) ----
  const seenStatements = new Map<string, ClaimRecord>();
  for (const claim of registry.claims) {
    const normalized = claim.statement.toLowerCase().trim().replace(/\s+/g, ' ');
    // Check for exact duplicate
    if (seenStatements.has(normalized)) {
      const original = seenStatements.get(normalized)!;
      findings.push({
        findingId: `dup-${claim.claimId}-${original.claimId}`,
        claimIds: [claim.claimId, original.claimId],
        findingType: 'duplicate-claim',
        severity: 'major',
        message: `Claim appears to duplicate ${original.claimId}`,
        explanation: `Both claims have identical or near-identical statements: "${claim.statement.slice(0, 80)}..."`,
        proposedAction: 'Merge the two claims or clarify the difference between them.',
        confidence: 0.9,
        requiresHumanReview: true,
      });
    } else {
      seenStatements.set(normalized, claim);
    }
  }

  // ---- Check 2: Ambiguous statements (vague qualifiers) ----
  const vagueTerms = ['probably', 'might be', 'could be', 'seems', 'perhaps', 'roughly', 'around', 'about', 'approximately', 'somewhat', 'various', 'certain', 'some'];
  for (const claim of registry.claims) {
    const lower = claim.statement.toLowerCase();
    const foundVague = vagueTerms.filter(v => lower.includes(v));
    if (foundVague.length >= 2) {
      findings.push({
        findingId: `ambig-${claim.claimId}`,
        claimIds: [claim.claimId],
        findingType: 'ambiguous-statement',
        severity: 'minor',
        message: `Claim uses multiple vague qualifiers: ${foundVague.join(', ')}`,
        explanation: `Vague qualifiers make it hard to validate the claim deterministically. Statement: "${claim.statement.slice(0, 80)}..."`,
        proposedAction: 'Replace vague qualifiers with specific values or ranges.',
        confidence: 0.7,
        requiresHumanReview: true,
      });
    }
  }

  // ---- Check 3: Unsupported canon (CANON claims with script-inserted provenance) ----
  for (const claim of registry.claims) {
    if (claim.truthLevel === 'CANON' && claim.provenance === 'script-inserted' && claim.approvalStatus !== 'approved') {
      findings.push({
        findingId: `unsup-canon-${claim.claimId}`,
        claimIds: [claim.claimId],
        findingType: 'unsupported-canon',
        severity: 'critical',
        message: `[CANON] claim has script-inserted provenance and is not user-approved`,
        explanation: `A canonical invariant should not be established by a script. Either the claim should be downgraded to [DERIVED] or it must go through human approval.`,
        proposedAction: 'Downgrade to [DERIVED] or submit for human approval review.',
        confidence: 0.95,
        requiresHumanReview: true,
      });
    }
  }

  // ---- Check 4: Overly broad claims (no scope specified) ----
  for (const claim of registry.claims) {
    // Check if the claim makes universal statements without scope
    const universalTerms = ['all', 'every', 'always', 'never', 'none', 'must', 'cannot'];
    const lower = claim.statement.toLowerCase();
    const hasUniversal = universalTerms.some(t => {
      const regex = new RegExp(`\\b${t}\\b`, 'i');
      return regex.test(lower);
    });
    // If it has universal language but no tags indicating scope
    if (hasUniversal && claim.tags.length === 0) {
      findings.push({
        findingId: `broad-${claim.claimId}`,
        claimIds: [claim.claimId],
        findingType: 'overly-broad-claim',
        severity: 'minor',
        message: `Claim uses universal language but has no scope tags`,
        explanation: `Universal statements without scope may be too broad. Statement: "${claim.statement.slice(0, 80)}..."`,
        proposedAction: 'Add scope tags (culture, region, era) or qualify the statement.',
        confidence: 0.6,
        requiresHumanReview: true,
      });
    }
  }

  // ---- Check 5: Missing measurement (claims about physical properties without physicalSpec) ----
  const measurementTerms = ['height', 'width', 'depth', 'speed', 'mass', 'weight', 'length', 'distance', 'duration'];
  for (const claim of registry.claims) {
    const lower = claim.statement.toLowerCase();
    const hasMeasurement = measurementTerms.some(t => lower.includes(t));
    if (hasMeasurement && !claim.physicalSpec) {
      findings.push({
        findingId: `meas-${claim.claimId}`,
        claimIds: [claim.claimId],
        findingType: 'missing-measurement',
        severity: 'minor',
        message: `Claim references physical measurements but has no physicalSpec`,
        explanation: `Statements about height, speed, etc. should include a PhysicalSpecification with ranges and units.`,
        proposedAction: 'Add a physicalSpec block with the measurement values and units.',
        confidence: 0.7,
        requiresHumanReview: true,
      });
    }
  }

  // ---- Check 6: Likely contradiction (claims with same domain but opposing universal terms) ----
  const claimsByDomain = new Map<string, ClaimRecord[]>();
  for (const c of registry.claims) {
    if (!claimsByDomain.has(c.domain)) claimsByDomain.set(c.domain, []);
    claimsByDomain.get(c.domain)!.push(c);
  }
  for (const [domain, claims] of claimsByDomain) {
    if (claims.length < 2) continue;
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i];
        const b = claims[j];
        // Simple heuristic: if one says "must" and the other says "cannot" on similar topics
        const aLower = a.statement.toLowerCase();
        const bLower = b.statement.toLowerCase();
        if ((aLower.includes('must') && bLower.includes('cannot')) ||
            (aLower.includes('always') && bLower.includes('never'))) {
          findings.push({
            findingId: `contra-${a.claimId}-${b.claimId}`,
            claimIds: [a.claimId, b.claimId],
            findingType: 'likely-contradiction',
            severity: 'major',
            message: `Claims in domain '${domain}' may contradict each other`,
            explanation: `Claim A uses 'must/always' while claim B uses 'cannot/never'. Review whether they apply in the same scope.\nA: "${a.statement.slice(0, 60)}..."\nB: "${b.statement.slice(0, 60)}..."`,
            proposedAction: 'Check if the claims have different scopes. If same scope, one must be wrong.',
            confidence: 0.5,
            requiresHumanReview: true,
          });
        }
      }
    }
  }

  // ---- Summary ----
  const findingTypes: SemanticFindingType[] = [
    'duplicate-claim', 'likely-contradiction', 'ambiguous-statement',
    'overly-broad-claim', 'unsupported-canon', 'missing-qualifier',
    'should-split', 'unimplementable', 'missing-measurement', 'scope-conflict',
  ];
  const summary = {} as Record<SemanticFindingType, number>;
  for (const t of findingTypes) summary[t] = findings.filter(f => f.findingType === t).length;

  const exerciseLevel: 'fixture' | 'subsystem' | 'corpus' =
    registry.claims.length < 50 ? 'fixture' : registry.claims.length < 500 ? 'subsystem' : 'corpus';

  const verdict: SemanticReviewReport['verdict'] =
    registry.claims.length === 0 ? 'not-exercised'
    : findings.some(f => f.severity === 'critical') ? 'fail'
    : findings.some(f => f.severity === 'major') ? 'warnings'
    : 'pass';

  return {
    totalClaims: registry.claims.length,
    claimsReviewed: registry.claims.length,
    findings,
    summary,
    verdict,
    exerciseLevel,
    coverage: {
      layerName: 'natural-language-semantic',
      checksRun: [
        'duplicate-claim (exact statement match)',
        'ambiguous-statement (multiple vague qualifiers)',
        'unsupported-canon (CANON with script-inserted provenance)',
        'overly-broad-claim (universal language without scope)',
        'missing-measurement (physical terms without physicalSpec)',
        'likely-contradiction (opposing universal terms in same domain)',
      ],
      notYetChecked: [
        'LLM-based semantic similarity analysis (requires z-ai-web-dev-sdk integration)',
        'cross-document contradiction detection (requires full-text comparison)',
        'implementation feasibility analysis (does the engine support this?)',
        'natural-language qualifier extraction (parse "usually", "often", "rarely")',
      ],
    },
    importantNote: 'This layer PROPOSES findings for human review. It does NOT automatically approve, reject, or modify claims. Every finding requires human review before action is taken.',
  };
}
