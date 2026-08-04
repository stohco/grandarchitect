/**
 * Hypothesis scoring.
 *
 * Each hypothesis is scored along 9 axes (see HypothesisScore in types.ts).
 * Six are positive (higher is better), three are penalties. The weighted
 * total decides whether the hypothesis is worth enacting, and which one
 * the Architect should pick by default.
 *
 * The weights are pinned below. They are the Architect's "taste" — changing
 * them changes what the Architect considers a good interpretation.
 */

import type { ArchitectHypothesis, HypothesisScore } from '../types';

// ============================================================================
// Pinned weights
// ============================================================================
// Positive axes are weighted in [0, 1]. Negative axes are weighted in [0, 1]
// and subtracted. The sum is normalised to roughly [-1, 1].

const W = {
  satisfiesExplicitRequest: 0.30,
  respectsArtDirection: 0.15,
  preservesEngineInvariants: 0.20,
  reusesConfirmedContext: 0.10,
  reversibility: 0.10,
  generality: 0.05,
  // penalties (subtracted):
  unsupportedSpecificity: 0.20,
  destructiveScope: 0.25,
  ambiguityPenalty: 0.15,
} as const;

// ============================================================================
// Estimators — each maps hypothesis attributes to an axis score in [-1, 1]
// ============================================================================

/**
 * Specificity ∈ [0, 1]. Higher = the hypothesis assumes more than the
 * request said. A hypothesis with assumedConstraints=[] and concrete
 * targets gets 0; one that pins 5+ assumed values gets close to 1.
 */
export function estimateSpecificity(h: ArchitectHypothesis): number {
  const assumed = h.assumedConstraints.length;
  const confirmed = h.confirmedConstraints.length;
  // Ratio of assumed to total; if all are confirmed, specificity is 0.
  const total = assumed + confirmed;
  if (total === 0) return 0;
  const ratio = assumed / total;
  // Each extra assumed constraint beyond 3 nudges it toward 1.
  const extra = Math.max(0, assumed - 3) / 6;
  return Math.min(1, ratio * 0.6 + extra * 0.4);
}

/**
 * Reversibility ∈ [0, 1]. Higher = easier to roll back.
 *   preview-only: 1.0
 *   single-entity: 0.9
 *   local-cluster: 0.7
 *   region-wide: 0.4
 *   world-wide: 0.2
 *   engine-invariant: 0.0
 */
export function estimateReversibility(h: ArchitectHypothesis): number {
  switch (h.scope) {
    case 'preview-only': return 1.0;
    case 'single-entity': return 0.9;
    case 'local-cluster': return 0.7;
    case 'region-wide': return 0.4;
    case 'world-wide': return 0.2;
    case 'engine-invariant': return 0.0;
  }
}

/**
 * Confidence ∈ [0, 1]. Higher = the hypothesis matches the request well.
 * Computed from confirmed-vs-assumed ratio and the number of unresolved
 * consequential variables.
 */
export function estimateConfidence(h: ArchitectHypothesis): number {
  const total = h.confirmedConstraints.length + h.assumedConstraints.length;
  if (total === 0) return 0.3;
  const confirmedRatio = h.confirmedConstraints.length / total;
  // Each unresolved variable reduces confidence by ~0.08, down to a floor.
  const unresolvedPenalty = Math.min(0.4, h.unresolvedVariables.length * 0.08);
  return Math.max(0.1, confirmedRatio - unresolvedPenalty);
}

// ============================================================================
// Score a single hypothesis
// ============================================================================

/**
 * Score a hypothesis. The breakdown is fully populated.
 *
 * The caller supplies per-axis hints via the optional `hints` argument;
 * anything not provided defaults to a derived estimate. This keeps scoring
 * transparent: every axis value is either an explicit hint or a documented
 * function of the hypothesis's fields.
 */
export function scoreHypothesis(
  h: ArchitectHypothesis,
  hints?: Partial<Pick<HypothesisScore,
    | 'satisfiesExplicitRequest'
    | 'respectsArtDirection'
    | 'preservesEngineInvariants'
    | 'reusesConfirmedContext'
    | 'generality'>>,
): ArchitectHypothesis {
  const satisfiesExplicitRequest = hints?.satisfiesExplicitRequest ?? estimateConfidence(h);
  const respectsArtDirection = hints?.respectsArtDirection ?? 0.7;
  const preservesEngineInvariants = hints?.preservesEngineInvariants ??
    (h.scope === 'engine-invariant' ? 0.0 : 1.0);
  const reusesConfirmedContext = hints?.reusesConfirmedContext ??
    Math.min(1, h.confirmedConstraints.length / 3);
  const reversibility = estimateReversibility(h);
  // Generality: how much does this hypothesis generalise? Over-specified
  // hypotheses score low; weak-sufficient ones score high.
  const generality = hints?.generality ?? Math.max(0, 1 - estimateSpecificity(h));

  const unsupportedSpecificity = estimateSpecificity(h);
  const destructiveScope = 1 - reversibility; // wide-blast-radius penalty
  const ambiguityPenalty = Math.min(1, h.unresolvedVariables.length / 5);

  const total =
    W.satisfiesExplicitRequest * satisfiesExplicitRequest +
    W.respectsArtDirection * respectsArtDirection +
    W.preservesEngineInvariants * preservesEngineInvariants +
    W.reusesConfirmedContext * reusesConfirmedContext +
    W.reversibility * reversibility +
    W.generality * generality -
    W.unsupportedSpecificity * unsupportedSpecificity -
    W.destructiveScope * destructiveScope -
    W.ambiguityPenalty * ambiguityPenalty;

  const breakdown: HypothesisScore = {
    satisfiesExplicitRequest,
    respectsArtDirection,
    preservesEngineInvariants,
    reusesConfirmedContext,
    reversibility,
    generality,
    unsupportedSpecificity,
    destructiveScope,
    ambiguityPenalty,
    total,
  };

  // requiresClarification is true when ambiguity penalty is high AND the
  // hypothesis is otherwise viable. A bad hypothesis shouldn't ask for
  // clarification — it should just be rejected.
  const requiresClarification =
    ambiguityPenalty >= 0.4 && total > 0 && h.scope !== 'preview-only';

  return { ...h, scoreBreakdown: breakdown, requiresClarification };
}

// ============================================================================
// Selection — pick the weakest sufficient hypothesis
// ============================================================================

/**
 * Among hypotheses with positive total, pick the one with the smallest
 * specificity (i.e. the most general viable interpretation). Ties broken
 * by higher reversibility, then by higher confidence.
 *
 * Returns null if no hypothesis has a positive total — the Architect
 * should ask for clarification rather than enact any of them.
 */
export function selectWeakestSufficient(hypotheses: ArchitectHypothesis[]): ArchitectHypothesis | null {
  const viable = hypotheses.filter(h => h.scoreBreakdown.total > 0);
  if (viable.length === 0) return null;
  // Sort: ascending specificity, descending reversibility, descending confidence.
  const sorted = [...viable].sort((a, b) => {
    const sa = estimateSpecificity(a);
    const sb = estimateSpecificity(b);
    if (sa !== sb) return sa - sb;
    const ra = estimateReversibility(a);
    const rb = estimateReversibility(b);
    if (ra !== rb) return rb - ra;
    return estimateConfidence(b) - estimateConfidence(a);
  });
  return sorted[0] ?? null;
}
