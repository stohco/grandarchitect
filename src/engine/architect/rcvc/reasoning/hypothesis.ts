/**
 * Hypothesis engine.
 *
 * Turns a free-text request into three scored hypotheses:
 *   0. weak-sufficient   — minimum change, no assumed constraints
 *   1. moderate          — some assumed constraints, scoped to the obvious target
 *   2. over-specified    — pins every variable, scores low on specificity
 *
 * The three-tier pattern is the Architect's taste: always show the user
 * the cheapest viable interpretation alongside the ambitious one, so the
 * cost of ambition is visible.
 */

import type {
  ArchitectHypothesis,
  ConstraintRef,
  ConstraintVar,
  HypothesisScope,
  HypothesisTarget,
} from '../types';
import { scoreHypothesis, estimateConfidence, estimateSpecificity, estimateReversibility } from './scoring';
import { createTargetResolver, type TargetResolverContext } from './target-resolver';

// ============================================================================
// Intent patterns — the four canonical art-direction intents
// ============================================================================

export type IntentKind = 'sacred' | 'wider' | 'denser' | 'quieter' | 'unknown';

interface IntentPattern {
  kind: IntentKind;
  match: RegExp;
  /** Suggested scope for the moderate hypothesis. */
  moderateScope: HypothesisScope;
  /** Suggested scope for the over-specified hypothesis. */
  overScope: HypothesisScope;
  /** Constraints the intent explicitly establishes. */
  confirmed: ConstraintRef[];
  /** Variables the intent leaves unresolved. */
  unresolved: ConstraintVar[];
}

const INTENTS: IntentPattern[] = [
  {
    kind: 'sacred',
    match: /\b(sacred|sanctify|hallow|consecrat|shrine|temple|spirit|ancestral)\b/i,
    moderateScope: 'local-cluster',
    overScope: 'region-wide',
    confirmed: [
      { id: 'sacred-tone', statement: 'Tone must be sacred: silence, incense, verticality.', source: 'corpus' },
      { id: 'no-secular-noise', statement: 'No taverns, markets, or forges within earshot.', source: 'corpus' },
    ],
    unresolved: [
      { name: 'sacred-radius', domain: { kind: 'float', min: 5, max: 50 }, description: 'Sacred quiet radius (m)' },
    ],
  },
  {
    kind: 'wider',
    match: /\b(wider|broader|expand|extend|grow the village|enlarge)\b/i,
    moderateScope: 'region-wide',
    overScope: 'world-wide',
    confirmed: [
      { id: 'outward-growth', statement: 'Growth must be outward from the lineage hall.', source: 'corpus' },
    ],
    unresolved: [
      { name: 'growth-direction', domain: { kind: 'enum', values: ['south', 'east', 'north', 'west', 'all'] }, description: 'Direction of expansion' },
      { name: 'new-household-count', domain: { kind: 'int', min: 1, max: 50 }, description: 'Number of new households' },
    ],
  },
  {
    kind: 'denser',
    match: /\b(denser|densify|compact|tighter|crowd|more households)\b/i,
    moderateScope: 'local-cluster',
    overScope: 'region-wide',
    confirmed: [
      { id: 'infill-first', statement: 'Densify by infill before expanding outward.', source: 'corpus' },
      { id: 'min-spacing', statement: 'Households keep minimum 3m spacing for fire break.', source: 'engine-invariant' },
    ],
    unresolved: [
      { name: 'target-density', domain: { kind: 'float', min: 0.1, max: 1.0 }, description: 'Target occupancy ratio' },
    ],
  },
  {
    kind: 'quieter',
    match: /\b(quieter|silent|calm|peaceful|hush|still|retir)\b/i,
    moderateScope: 'local-cluster',
    overScope: 'region-wide',
    confirmed: [
      { id: 'quiet-tone', statement: 'Tone must be quiet: no forges, no markets.', source: 'corpus' },
    ],
    unresolved: [
      { name: 'quiet-radius', domain: { kind: 'float', min: 5, max: 100 }, description: 'Quiet radius (m)' },
    ],
  },
];

function matchIntent(request: string): IntentPattern | null {
  for (const p of INTENTS) {
    if (p.match.test(request)) return p;
  }
  return null;
}

// ============================================================================
// Hypothesis factory
// ============================================================================

let hypothesisCounter = 0;

function nextId(requestId: string, tier: number): string {
  hypothesisCounter = (hypothesisCounter + 1) % 1_000_000;
  return `hypo-${requestId}-${tier}-${hypothesisCounter}`;
}

function makeHypothesis(args: {
  requestId: string;
  tier: 0 | 1 | 2;
  interpretation: string;
  targets: HypothesisTarget[];
  confirmed: ConstraintRef[];
  assumed: ConstraintRef[];
  unresolved: ConstraintVar[];
  scope: HypothesisScope;
}): ArchitectHypothesis {
  const base: ArchitectHypothesis = {
    id: nextId(args.requestId, args.tier),
    requestId: args.requestId,
    interpretation: args.interpretation,
    targetCandidates: args.targets,
    confirmedConstraints: args.confirmed,
    assumedConstraints: args.assumed,
    unresolvedVariables: args.unresolved,
    scope: args.scope,
    specificityScore: 0,
    reversibilityScore: 0,
    confidence: 0,
    requiresClarification: false,
    scoreBreakdown: {
      satisfiesExplicitRequest: 0,
      respectsArtDirection: 0,
      preservesEngineInvariants: 0,
      reusesConfirmedContext: 0,
      reversibility: 0,
      generality: 0,
      unsupportedSpecificity: 0,
      destructiveScope: 0,
      ambiguityPenalty: 0,
      total: 0,
    },
  };
  const scored = scoreHypothesis(base, {
    // Tier 0 (weak-sufficient) honours the request explicitly.
    // Tier 1 (moderate) does too, plus some assumed constraints.
    // Tier 2 (over-specified) does too, but over-specifies.
    satisfiesExplicitRequest: 0.9 - args.tier * 0.1,
    respectsArtDirection: args.tier === 2 ? 0.4 : 0.8,
    preservesEngineInvariants: args.scope === 'engine-invariant' ? 0.0 : 1.0,
    reusesConfirmedContext: Math.min(1, args.confirmed.length / 3),
    generality: args.tier === 0 ? 0.9 : args.tier === 1 ? 0.5 : 0.2,
  });
  return {
    ...scored,
    specificityScore: estimateSpecificity(scored),
    reversibilityScore: estimateReversibility(scored),
    confidence: estimateConfidence(scored),
  };
}

// ============================================================================
// Engine
// ============================================================================

export interface HypothesisEngineOptions {
  /** Resolver context (entities, selection, regions, systems). */
  ctx?: TargetResolverContext;
}

export function createHypothesisEngine(opts: HypothesisEngineOptions = {}) {
  const resolver = createTargetResolver(opts.ctx ?? {});

  return {
    /**
     * Generate 3 hypotheses for `request`. Always returns exactly 3.
     */
    interpret(requestId: string, request: string): ArchitectHypothesis[] {
      const intent = matchIntent(request);
      const { targets } = resolver.resolve(request);
      const targetList = targets.length > 0 ? targets : [
        { ref: 'wildcard:any', kind: 'wildcard' as const, label: 'unspecified target' },
      ];
      const confirmed = intent?.confirmed ?? [];
      const unresolved = intent?.unresolved ?? [];

      // Tier 0: weak-sufficient. Preview-only, no assumed constraints.
      const h0 = makeHypothesis({
        requestId,
        tier: 0,
        interpretation: intent
          ? `Preview a ${intent.kind} adjustment to ${targetList.map(t => t.label).join(', ')} without committing.`
          : `Preview a minimal adjustment to ${targetList.map(t => t.label).join(', ')}.`,
        targets: targetList,
        confirmed,
        assumed: [],
        unresolved,
        scope: 'preview-only',
      });

      // Tier 1: moderate. The "obvious" interpretation, scoped appropriately.
      const moderateScope = intent?.moderateScope ?? 'local-cluster';
      const h1 = makeHypothesis({
        requestId,
        tier: 1,
        interpretation: intent
          ? `Apply a ${intent.kind} adjustment to ${targetList.map(t => t.label).join(', ')} (${moderateScope}).`
          : `Apply the requested change to ${targetList.map(t => t.label).join(', ')} (${moderateScope}).`,
        targets: targetList,
        confirmed,
        assumed: intent
          ? [{ id: `${intent.kind}-default-radius`, statement: `Assume default radius for ${intent.kind} intent.`, source: 'assumed' }]
          : [{ id: 'default-action', statement: 'Assume the user wants the default action.', source: 'assumed' }],
        unresolved,
        scope: moderateScope,
      });

      // Tier 2: over-specified. Pins every variable; scores low.
      const overScope = intent?.overScope ?? 'region-wide';
      const overAssumed: ConstraintRef[] = intent
        ? [
            { id: `${intent.kind}-pinned-radius`, statement: `Pin ${intent.kind} radius to the corpus maximum.`, source: 'assumed' },
            { id: `${intent.kind}-pinned-tone`, statement: `Pin tone to the strictest ${intent.kind} variant.`, source: 'assumed' },
            { id: `${intent.kind}-pinned-material`, statement: `Pin materials to the canonical ${intent.kind} palette.`, source: 'assumed' },
            { id: `${intent.kind}-pinned-lighting`, statement: `Pin lighting to the canonical ${intent.kind} setting.`, source: 'assumed' },
          ]
        : [
            { id: 'pinned-action', statement: 'Pin the action to the most specific interpretation.', source: 'assumed' },
            { id: 'pinned-target', statement: 'Pin the target to the first resolved candidate.', source: 'assumed' },
          ];
      const h2 = makeHypothesis({
        requestId,
        tier: 2,
        interpretation: `Apply the strictest ${intent?.kind ?? 'default'} interpretation to ${targetList.map(t => t.label).join(', ')}, pinning radius, tone, material, and lighting (${overScope}).`,
        targets: targetList,
        confirmed,
        assumed: overAssumed,
        unresolved: [], // over-specified: nothing left unresolved
        scope: overScope,
      });

      return [h0, h1, h2];
    },
  };
}
