/**
 * Hypothesis Scoring — the "weakest, not shortest" principle
 *
 * Implements the candidate scoring function from the user's analysis:
 *
 *   Candidate score =
 *       satisfies explicit request
 *     + respects established art direction
 *     + preserves engine invariants
 *     + reuses confirmed context
 *     + reversibility
 *     + generality
 *     - unsupported specificity
 *     - destructive scope
 *     - ambiguity
 *
 * The *weakest* (least-committal) valid hypothesis is preferred. Weaker
 * hypotheses leave more decisions as unresolved variables and make fewer
 * unsupported assumptions.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ArchitectHypothesis,
  HypothesisScore,
  ConfirmedConstraint,
  AssumedConstraint,
  UnresolvedVariable,
  ScopeEstimate,
  TargetCandidate,
} from '../types';

// ============================================================================
// Weight configuration
// ============================================================================

export interface ScoreWeights {
  satisfiesExplicitRequest: number;
  respectsArtDirection: number;
  preservesEngineInvariants: number;
  reusesConfirmedContext: number;
  reversibility: number;
  generality: number;
  unsupportedSpecificity: number;   // penalty weight
  destructiveScope: number;          // penalty weight
  ambiguityPenalty: number;          // penalty weight
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  satisfiesExplicitRequest: 3.0,
  respectsArtDirection: 2.0,
  preservesEngineInvariants: 3.0,
  reusesConfirmedContext: 1.5,
  reversibility: 1.5,
  generality: 2.0,
  unsupportedSpecificity: 2.5,
  destructiveScope: 3.0,
  ambiguityPenalty: 1.0,
};

// ============================================================================
// Scoring inputs
// ============================================================================

export interface ScoreInputs {
  /** Does the hypothesis address every explicit word of the request? 0..1 */
  satisfiesExplicitRequest: number;
  /** Does it respect established art-direction tags? 0..1 */
  respectsArtDirection: number;
  /** Does it preserve all engine invariants? 0..1 (1 = all preserved) */
  preservesEngineInvariants: number;
  /** Does it reuse already-confirmed context rather than inventing new? 0..1 */
  reusesConfirmedContext: number;
  /** How reversible is it? 0..1 (1 = trivially reversible) */
  reversibility: number;
  /** How general / reusable is the interpretation? 0..1 (1 = maximally general) */
  generality: number;
  /** How much unsupported specificity does it add? 0..1 (1 = wildly over-specified) */
  unsupportedSpecificity: number;
  /** How destructive is its scope? 0..1 (1 = irreversible destruction) */
  destructiveScope: number;
  /** How ambiguous is it? 0..1 (1 = maximally ambiguous) */
  ambiguityPenalty: number;
}

// ============================================================================
// Core scoring
// ============================================================================

export function scoreHypothesis(inputs: ScoreInputs, weights: ScoreWeights = DEFAULT_WEIGHTS): HypothesisScore {
  const total =
    inputs.satisfiesExplicitRequest * weights.satisfiesExplicitRequest +
    inputs.respectsArtDirection * weights.respectsArtDirection +
    inputs.preservesEngineInvariants * weights.preservesEngineInvariants +
    inputs.reusesConfirmedContext * weights.reusesConfirmedContext +
    inputs.reversibility * weights.reversibility +
    inputs.generality * weights.generality -
    inputs.unsupportedSpecificity * weights.unsupportedSpecificity -
    inputs.destructiveScope * weights.destructiveScope -
    inputs.ambiguityPenalty * weights.ambiguityPenalty;

  return {
    satisfiesExplicitRequest: inputs.satisfiesExplicitRequest,
    respectsArtDirection: inputs.respectsArtDirection,
    preservesEngineInvariants: inputs.preservesEngineInvariants,
    reusesConfirmedContext: inputs.reusesConfirmedContext,
    reversibility: inputs.reversibility,
    generality: inputs.generality,
    unsupportedSpecificity: inputs.unsupportedSpecificity,
    destructiveScope: inputs.destructiveScope,
    ambiguityPenalty: inputs.ambiguityPenalty,
    total,
  };
}

// ============================================================================
// Specificity estimation
// ============================================================================

/**
 * Specificity = how many assumptions are baked in beyond what the evidence
 * supports. Lower specificity = weaker (more committal-respecting) hypothesis.
 *
 * Factors:
 *  - Number of assumed constraints (each adds specificity)
 *  - Number of unresolved variables that were *resolved without asking*
 *  - Narrowness of scope
 */
export function estimateSpecificity(
  assumed: AssumedConstraint[],
  unresolved: UnresolvedVariable[],
  silentlyResolved: number,
  scope: ScopeEstimate,
): number {
  const assumedWeight = assumed.reduce((sum, a) => sum + (1 - a.confidence) * 0.5 + 0.5, 0);
  const unresolvedWeight = silentlyResolved * 0.8;
  const scopeWeight = Math.min(1, scope.entitiesAffected / 50) * 0.3;
  const total = assumedWeight * 0.4 + unresolvedWeight * 0.4 + scopeWeight * 0.2;
  return clamp01(total);
}

// ============================================================================
// Reversibility estimation
// ============================================================================

export function estimateReversibility(scope: ScopeEstimate): number {
  return clamp01(scope.reversibilityScore * 0.7 + (1 - scope.destructiveScope) * 0.3);
}

// ============================================================================
// Confidence estimation
// ============================================================================

export function estimateConfidence(
  confirmed: ConfirmedConstraint[],
  assumed: AssumedConstraint[],
  targets: TargetCandidate[],
  score: HypothesisScore,
): number {
  const confirmedFactor = Math.min(1, confirmed.length * 0.15 + 0.3);
  const assumedFactor = assumed.length > 0
    ? assumed.reduce((s, a) => s + a.confidence, 0) / assumed.length
    : 1;
  const targetFactor = targets.length > 0
    ? targets[0].confidence
    : 0.5;
  const scoreFactor = clamp01((score.total + 10) / 20);  // normalize roughly to 0..1
  return clamp01(confirmedFactor * 0.3 + assumedFactor * 0.2 + targetFactor * 0.2 + scoreFactor * 0.3);
}

// ============================================================================
// Helpers
// ============================================================================

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Given a set of hypotheses, return the *weakest sufficient* one — the
 * hypothesis with the lowest specificity that still has confidence above
 * the threshold and a positive total score.
 */
export function selectWeakestSufficient(
  hypotheses: ArchitectHypothesis[],
  minConfidence = 0.4,
): ArchitectHypothesis | undefined {
  const viable = hypotheses.filter(h => h.confidence >= minConfidence && h.scoreBreakdown.total > 0);
  if (viable.length === 0) return undefined;
  // Sort by specificity ascending (weakest first), then by score descending
  viable.sort((a, b) => {
    if (Math.abs(a.specificityScore - b.specificityScore) > 0.05) {
      return a.specificityScore - b.specificityScore;
    }
    return b.scoreBreakdown.total - a.scoreBreakdown.total;
  });
  return viable[0];
}
