/**
 * Hypothesis Engine — weakest-sufficient interpretation
 *
 * Given a natural-language request, generates multiple plausible
 * interpretations and selects the *weakest sufficient* one.
 *
 * Example:
 *   User: "Make this valley feel sacred."
 *
 *   Bad (over-specified) hypothesis:
 *     Add blue glowing crystals + golden temple + floating particles
 *     + choir music + fog + replace trees
 *
 *   Weak sufficient hypothesis:
 *     Desired property: valley communicates sacredness.
 *     Confirmed: preserve navigation, mountain sightline, combat space, quest assets.
 *     Unresolved: architectural expression, lighting style, supernatural
 *                 intensity, cultural origin, audio treatment.
 *     → Ask before making consequential assumptions.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ArchitectHypothesis,
  ArchitectHypothesis as Hypothesis,
  ConfirmedConstraint,
  AssumedConstraint,
  UnresolvedVariable,
  ScopeEstimate,
  TargetCandidate,
  InterpretContext,
} from '../types';
import type { TargetResolver, ResolvableEntity } from './target-resolver';
import { createTargetResolver } from './target-resolver';
import {
  scoreHypothesis,
  estimateSpecificity,
  estimateReversibility,
  estimateConfidence,
  selectWeakestSufficient,
  type ScoreInputs,
} from './scoring';

// ============================================================================
// Intent lexicon — maps NL fragments to desired properties
// ============================================================================

export interface IntentPattern {
  pattern: RegExp;
  property: string;
  confirmedConstraints: ConfirmedConstraint[];
  unresolvedVariables: UnresolvedVariable[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    pattern: /sacred|divine|holy|spiritual|sacrosanct/i,
    property: 'communicate sacredness',
    confirmedConstraints: [
      { id: 'c-nav', label: 'Preserve navigation', source: 'navigation', expression: 'navigation_graph.unchanged' },
      { id: 'c-sight', label: 'Preserve mountain sightline', source: 'engine_invariant', expression: 'sightline.mountain != blocked' },
      { id: 'c-combat', label: 'Do not reduce combat space', source: 'engine_invariant', expression: 'combat_space.area >= current' },
      { id: 'c-quest', label: 'Do not alter existing quest assets', source: 'quest_state', expression: 'quest_entities.touched == false' },
    ],
    unresolvedVariables: [
      {
        id: 'v-arch',
        label: 'Architectural expression',
        domain: ['naturally aged composition', 'overt supernatural effects', 'hybrid'],
        defaultIndex: 0,
        consequenceIfWrong: 'moderate',
      },
      {
        id: 'v-light',
        label: 'Lighting style',
        domain: ['warm dawn', 'cool ethereal', 'dramatic chiaroscuro', 'soft diffuse'],
        defaultIndex: 1,
        consequenceIfWrong: 'low',
      },
      {
        id: 'v-supernatural',
        label: 'Supernatural intensity',
        domain: ['none', 'subtle', 'moderate', 'pronounced'],
        defaultIndex: 1,
        consequenceIfWrong: 'moderate',
      },
      {
        id: 'v-culture',
        label: 'Cultural origin',
        domain: ['auto-detect from region', 'northern orthodox', 'southern mystical', 'indigenous'],
        defaultIndex: 0,
        consequenceIfWrong: 'moderate',
      },
    ],
  },
  {
    pattern: /wider|broader|expand|enlarge|bigger/i,
    property: 'increase spatial extent',
    confirmedConstraints: [
      { id: 'c-nav', label: 'Preserve navigation', source: 'navigation', expression: 'navigation_graph.unchanged' },
      { id: 'c-collision', label: 'Maintain collision integrity', source: 'engine_invariant', expression: 'collision.valid' },
    ],
    unresolvedVariables: [
      {
        id: 'v-axis',
        label: 'Expansion axis',
        domain: ['uniform', 'x-axis (width)', 'z-axis (depth)', 'both'],
        defaultIndex: 0,
        consequenceIfWrong: 'low',
      },
      {
        id: 'v-amount',
        label: 'Expansion amount',
        domain: ['10%', '25%', '50%', '100%'],
        defaultIndex: 1,
        consequenceIfWrong: 'low',
      },
    ],
  },
  {
    pattern: /denser|more|populate|fill|add/i,
    property: 'increase density',
    confirmedConstraints: [
      { id: 'c-perf', label: 'Maintain performance budget', source: 'performance_budget', expression: 'gpu_ms <= budget' },
      { id: 'c-nav', label: 'Preserve navigation', source: 'navigation', expression: 'navigation_graph.unchanged' },
    ],
    unresolvedVariables: [
      {
        id: 'v-density',
        label: 'Target density',
        domain: ['sparse', 'moderate', 'dense', 'clumped'],
        defaultIndex: 1,
        consequenceIfWrong: 'low',
      },
      {
        id: 'v-species',
        label: 'Species composition',
        domain: ['auto-detect from biome', 'single dominant', 'mixed community'],
        defaultIndex: 0,
        consequenceIfWrong: 'moderate',
      },
    ],
  },
  {
    pattern: /quieter|calmer|peaceful|serene|tranquil/i,
    property: 'reduce ambient intensity',
    confirmedConstraints: [
      { id: 'c-quest', label: 'Do not alter existing quest assets', source: 'quest_state', expression: 'quest_entities.touched == false' },
    ],
    unresolvedVariables: [
      {
        id: 'v-audio',
        label: 'Audio treatment',
        domain: ['ambient nature only', 'minimal musical beds', 'silence'],
        defaultIndex: 0,
        consequenceIfWrong: 'low',
      },
    ],
  },
];

// ============================================================================
// Hypothesis generator
// ============================================================================

export interface HypothesisEngine {
  interpret(request: string, context?: InterpretContext, entityPool?: ResolvableEntity[]): Hypothesis[];
  selectWeakest(hypotheses: Hypothesis[]): Hypothesis | undefined;
}

export function createHypothesisEngine(): HypothesisEngine {
  let hypothesisCounter = 0;
  let requestCounter = 0;

  function newId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${(hypothesisCounter++).toString(36)}`;
  }

  function matchIntent(request: string): IntentPattern | null {
    for (const p of INTENT_PATTERNS) {
      if (p.pattern.test(request)) return p;
    }
    return null;
  }

  function buildScope(
    confirmed: ConfirmedConstraint[],
    unresolved: UnresolvedVariable[],
    silentlyResolved: number,
    entityCount: number,
  ): ScopeEstimate {
    const systemsTouched = ['renderer'];
    if (confirmed.some(c => c.source === 'navigation')) systemsTouched.push('navigation');
    if (confirmed.some(c => c.source === 'quest_state')) systemsTouched.push('quest');
    if (confirmed.some(c => c.source === 'performance_budget')) systemsTouched.push('gpu');

    const reversibilityScore = unresolved.length >= 2 ? 0.8 : 0.5;
    const destructiveScope = silentlyResolved > 2 ? 0.4 : 0.1;

    return {
      entitiesAffected: entityCount,
      terrainChunksAffected: silentlyResolved > 1 ? Math.ceil(entityCount / 10) : 0,
      systemsTouched,
      reversibilityScore,
      destructiveScope,
    };
  }

  function buildScoreInputs(
    pattern: IntentPattern | null,
    confirmed: ConfirmedConstraint[],
    assumed: AssumedConstraint[],
    unresolved: UnresolvedVariable[],
    silentlyResolved: number,
    scope: ScopeEstimate,
    confidence: number,
  ): ScoreInputs {
    return {
      satisfiesExplicitRequest: pattern ? 0.9 : 0.5,
      respectsArtDirection: 0.85,
      preservesEngineInvariants: confirmed.length > 0 ? 0.95 : 0.6,
      reusesConfirmedContext: confirmed.length * 0.15,
      reversibility: scope.reversibilityScore,
      generality: 1 - (assumed.length * 0.15 + silentlyResolved * 0.1),
      unsupportedSpecificity: assumed.length * 0.2 + silentlyResolved * 0.15,
      destructiveScope: scope.destructiveScope,
      ambiguityPenalty: unresolved.length === 0 ? 0.3 : Math.max(0, 0.2 - unresolved.length * 0.05),
    };
  }

  function interpret(
    request: string,
    context?: InterpretContext,
    entityPool: ResolvableEntity[] = [],
  ): Hypothesis[] {
    const requestId = `req-${(requestCounter++).toString(36)}`;
    const pattern = matchIntent(request);
    const hypotheses: Hypothesis[] = [];

    // Resolve targets
    const resolver: TargetResolver = createTargetResolver(entityPool);
    const targetRef = extractTargetReference(request) ?? 'selection';
    const targetCandidates: TargetCandidate[] = entityPool.length > 0
      ? resolver.resolve(targetRef, entityPool).slice(0, 4)
      : [];

    // ----- Hypothesis A: weak sufficient (preferred) -----
    {
      const confirmed = pattern ? [...pattern.confirmedConstraints] : [];
      const unresolved = pattern ? [...pattern.unresolvedVariables] : [];
      const assumed: AssumedConstraint[] = [];
      const silentlyResolved = 0;
      const scope = buildScope(confirmed, unresolved, silentlyResolved, targetCandidates.length);
      const scoreInputs = buildScoreInputs(pattern, confirmed, assumed, unresolved, silentlyResolved, scope, 0.7);
      const score = scoreHypothesis(scoreInputs);
      const specificity = estimateSpecificity(assumed, unresolved, silentlyResolved, scope);
      const reversibility = estimateReversibility(scope);
      const confidence = estimateConfidence(confirmed, assumed, targetCandidates, score);

      hypotheses.push({
        id: newId('hyp'),
        requestId,
        interpretation: `Desired property: ${pattern?.property ?? 'satisfy request'}.\n` +
          `Confirmed: ${confirmed.map(c => c.label).join(', ') || 'none'}.\n` +
          `Unresolved: ${unresolved.map(u => u.label).join(', ') || 'none'}.\n` +
          `→ Ask before making consequential assumptions.`,
        targetCandidates,
        confirmedConstraints: confirmed,
        assumedConstraints: assumed,
        unresolvedVariables: unresolved,
        scope,
        specificityScore: specificity,
        reversibilityScore: reversibility,
        confidence,
        requiresClarification: unresolved.length > 0,
        scoreBreakdown: score,
      });
    }

    // ----- Hypothesis B: moderately specified (one assumption baked in) -----
    {
      const confirmed = pattern ? [...pattern.confirmedConstraints] : [];
      const assumed: AssumedConstraint[] = pattern
        ? [{ id: 'a-1', label: 'Assume natural expression over supernatural', expression: 'style == natural', confidence: 0.6, reversibleIfWrong: true }]
        : [];
      const unresolved = pattern
        ? pattern.unresolvedVariables.filter((_, i) => i !== 0)  // resolve the first variable silently
        : [];
      const silentlyResolved = 1;
      const scope = buildScope(confirmed, unresolved, silentlyResolved, targetCandidates.length);
      const scoreInputs = buildScoreInputs(pattern, confirmed, assumed, unresolved, silentlyResolved, scope, 0.6);
      const score = scoreHypothesis(scoreInputs);
      const specificity = estimateSpecificity(assumed, unresolved, silentlyResolved, scope);
      const reversibility = estimateReversibility(scope);
      const confidence = estimateConfidence(confirmed, assumed, targetCandidates, score);

      hypotheses.push({
        id: newId('hyp'),
        requestId,
        interpretation: `Desired property: ${pattern?.property ?? 'satisfy request'}.\n` +
          `Assumed: ${assumed.map(a => a.label).join(', ')}.\n` +
          `Confirmed: ${confirmed.map(c => c.label).join(', ') || 'none'}.\n` +
          `Unresolved: ${unresolved.map(u => u.label).join(', ') || 'none'}.`,
        targetCandidates,
        confirmedConstraints: confirmed,
        assumedConstraints: assumed,
        unresolvedVariables: unresolved,
        scope,
        specificityScore: specificity,
        reversibilityScore: reversibility,
        confidence,
        requiresClarification: unresolved.length > 0,
        scoreBreakdown: score,
      });
    }

    // ----- Hypothesis C: over-specified (the "bad" one — for contrast) -----
    {
      const confirmed = pattern ? [...pattern.confirmedConstraints] : [];
      const assumed: AssumedConstraint[] = pattern
        ? [
            { id: 'a-1', label: 'Add blue glowing crystals', expression: 'add(crystals, blue)', confidence: 0.3, reversibleIfWrong: false },
            { id: 'a-2', label: 'Add golden temple', expression: 'add(temple, golden)', confidence: 0.25, reversibleIfWrong: false },
            { id: 'a-3', label: 'Add floating particles', expression: 'add(particles)', confidence: 0.3, reversibleIfWrong: true },
            { id: 'a-4', label: 'Add choir music', expression: 'add(audio, choir)', confidence: 0.2, reversibleIfWrong: true },
            { id: 'a-5', label: 'Replace trees', expression: 'replace(trees, sacred_trees)', confidence: 0.15, reversibleIfWrong: false },
          ]
        : [{ id: 'a-1', label: 'Assume specific implementation', expression: 'specific_impl', confidence: 0.2, reversibleIfWrong: false }];
      const unresolved: UnresolvedVariable[] = [];
      const silentlyResolved = assumed.length;
      const scope = buildScope(confirmed, unresolved, silentlyResolved, targetCandidates.length);
      scope.destructiveScope = 0.6;
      scope.reversibilityScore = 0.2;
      const scoreInputs = buildScoreInputs(pattern, confirmed, assumed, unresolved, silentlyResolved, scope, 0.3);
      const score = scoreHypothesis(scoreInputs);
      const specificity = estimateSpecificity(assumed, unresolved, silentlyResolved, scope);
      const reversibility = estimateReversibility(scope);
      const confidence = estimateConfidence(confirmed, assumed, targetCandidates, score);

      hypotheses.push({
        id: newId('hyp'),
        requestId,
        interpretation: `Over-specified: ${assumed.map(a => a.label).join(' + ')}.\n` +
          `⚠ This makes ${assumed.length} unsupported assumptions.`,
        targetCandidates,
        confirmedConstraints: confirmed,
        assumedConstraints: assumed,
        unresolvedVariables: unresolved,
        scope,
        specificityScore: specificity,
        reversibilityScore: reversibility,
        confidence,
        requiresClarification: false,
        scoreBreakdown: score,
      });
    }

    return hypotheses;
  }

  function selectWeakest(hypotheses: Hypothesis[]): Hypothesis | undefined {
    return selectWeakestSufficient(hypotheses);
  }

  return { interpret, selectWeakest };
}

// ============================================================================
// Helpers
// ============================================================================

function extractTargetReference(request: string): string | null {
  // "make *that roof* wider" → "roof"
  const m = request.match(/(?:that|the|this)\s+([\w-]+)/i);
  if (m) return m[1];
  // "make *it* ..." → use selection
  if (/\bit\b/i.test(request)) return 'selection';
  return null;
}
