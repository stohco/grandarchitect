/**
 * Clarification Generator
 *
 * Generates the questions the Architect asks before committing to a
 * hypothesis. Only asks about *consequential* unresolved variables —
 * low-consequence variables use their default.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  ArchitectHypothesis,
  ClarificationQuestion,
  ClarificationOption,
  UnresolvedVariable,
} from '../types';

// ============================================================================
// Clarification generator
// ============================================================================

export interface ClarificationGenerator {
  /** Generate questions for the consequential unresolved variables in a hypothesis. */
  generate(hypothesis: ArchitectHypothesis): ClarificationQuestion[];
  /** Filter to only consequential variables (moderate or worse). */
  filterConsequential(vars: UnresolvedVariable[]): UnresolvedVariable[];
}

export function createClarificationGenerator(): ClarificationGenerator {
  function filterConsequential(vars: UnresolvedVariable[]): UnresolvedVariable[] {
    return vars.filter(v => v.consequenceIfWrong === 'moderate' || v.consequenceIfWrong === 'severe' || v.consequenceIfWrong === 'destructive');
  }

  function generate(hypothesis: ArchitectHypothesis): ClarificationQuestion[] {
    const consequential = filterConsequential(hypothesis.unresolvedVariables);
    const questions: ClarificationQuestion[] = [];

    for (const v of consequential) {
      const options: ClarificationOption[] = v.domain.map((val, idx) => ({
        label: val,
        description: `Resolve "${v.label}" to "${val}"`,
        resolvesVariableId: v.id,
        resolvesValue: val,
        resultingSpecificity: idx === v.defaultIndex
          ? hypothesis.specificityScore
          : Math.min(1, hypothesis.specificityScore + 0.05),
      }));

      questions.push({
        questionId: `q-${v.id}-${hypothesis.id.slice(-6)}`,
        hypothesisId: hypothesis.id,
        prompt: buildPrompt(hypothesis, v),
        options,
        allowsFreeText: v.consequenceIfWrong === 'destructive',
        consequenceLevel: v.consequenceIfWrong,
      });
    }

    // If there are multiple target candidates with close confidence, add a target question
    if (hypothesis.targetCandidates.length >= 2) {
      const top = hypothesis.targetCandidates[0];
      const second = hypothesis.targetCandidates[1];
      if (top && second && (top.confidence - second.confidence) < 0.2) {
        questions.unshift({
          questionId: `q-target-${hypothesis.id.slice(-6)}`,
          hypothesisId: hypothesis.id,
          prompt: `I found multiple candidates for the target. Which did you mean?`,
          options: hypothesis.targetCandidates.slice(0, 4).map(c => ({
            label: c.label,
            description: `Confidence ${(c.confidence * 100).toFixed(0)}% — ${c.rationale}`,
            resolvesVariableId: 'target',
            resolvesValue: c.candidateId,
            resultingSpecificity: hypothesis.specificityScore + 0.02,
          })),
          allowsFreeText: false,
          consequenceLevel: 'moderate',
        });
      }
    }

    return questions;
  }

  return { generate, filterConsequential };
}

// ============================================================================
// Prompt builder
// ============================================================================

function buildPrompt(hypothesis: ArchitectHypothesis, variable: UnresolvedVariable): string {
  const target = hypothesis.targetCandidates[0]?.label ?? 'the selection';
  const intent = hypothesis.interpretation.split('\n')[0]?.replace('Desired property: ', '') ?? 'your request';

  switch (variable.label) {
    case 'Architectural expression':
      return `I understand that you want ${target} to ${intent}. Should sacredness be expressed naturally through age and composition, or overtly through supernatural effects?`;
    case 'Lighting style':
      return `What lighting style should ${target} use to ${intent}?`;
    case 'Supernatural intensity':
      return `How overt should the supernatural elements be when making ${target} ${intent}?`;
    case 'Cultural origin':
      return `Which cultural origin should the sacred treatment of ${target} draw from?`;
    case 'Expansion axis':
      return `Along which axis should ${target} be expanded?`;
    case 'Expansion amount':
      return `By how much should ${target} be expanded?`;
    case 'Target density':
      return `What target density do you want for ${target}?`;
    case 'Species composition':
      return `What species composition should be used when populating ${target}?`;
    case 'Audio treatment':
      return `What audio treatment do you want for ${target}?`;
    default:
      return `Please choose a value for "${variable.label}" to proceed with making ${target} ${intent}.`;
  }
}
