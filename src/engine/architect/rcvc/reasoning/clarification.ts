/**
 * Clarification generator.
 *
 * Generates questions ONLY for consequential unresolved variables —
 * variables whose value would meaningfully change which hypothesis is
 * enacted or what its scope becomes. Trivial variables (e.g. exact pixel
 * coordinates) do not get clarification prompts.
 */

import type { ArchitectHypothesis, ClarificationQuestion, ConstraintVar } from '../types';

// ============================================================================
// Consequential-variable detection
// ============================================================================

/**
 * A variable is "consequential" if its domain spans values that would
 * change the hypothesis's scope or its score breakdown materially.
 *
 * Heuristics:
 *   - enum with > 1 value: always consequential (the choice matters)
 *   - int / float range: consequential if max - min is large relative to
 *     the hypothesis's tolerance (we use a coarse threshold)
 *   - bool: consequential only if the hypothesis's scope is preview-only
 *     (a yes/no can promote it to a committed change)
 */
function isConsequential(v: ConstraintVar, h: ArchitectHypothesis): boolean {
  switch (v.domain.kind) {
    case 'enum':
      return v.domain.values.length > 1;
    case 'bool':
      return h.scope === 'preview-only';
    case 'int':
    case 'float': {
      const span = v.domain.max - v.domain.min;
      // Threshold: floats with span >= 10, ints with span >= 5.
      const threshold = v.domain.kind === 'float' ? 10 : 5;
      return span >= threshold;
    }
  }
}

// ============================================================================
// Question phrasing
// ============================================================================

function phraseQuestion(v: ConstraintVar): { question: string; options?: string[]; rationale: string } {
  const label = v.description ?? v.name;
  switch (v.domain.kind) {
    case 'enum':
      return {
        question: `Which ${label} should I use?`,
        options: v.domain.values,
        rationale: `The choice of ${label} determines which sub-region of the design space the enactment enters. Each option leads to a materially different outcome.`,
      };
    case 'bool':
      return {
        question: `Should ${label} be true or false?`,
        options: ['true', 'false'],
        rationale: `This is a yes/no decision that determines whether the change commits to the canonical world or stays as a preview.`,
      };
    case 'int':
    case 'float': {
      const unit = v.domain.kind === 'float' ? ' (continuous)' : ' (integer)';
      return {
        question: `What value should ${label} take? Range: [${v.domain.min}, ${v.domain.max}]${unit}.`,
        rationale: `The chosen value changes the spatial extent and therefore the scope of the enactment. Pick the smallest value that satisfies your intent to keep the change reversible.`,
      };
    }
  }
}

// ============================================================================
// Generator
// ============================================================================

export function createClarificationGenerator() {
  return {
    /** Generate clarification questions for a single hypothesis. */
    forHypothesis(h: ArchitectHypothesis): ClarificationQuestion[] {
      const out: ClarificationQuestion[] = [];
      for (const v of h.unresolvedVariables) {
        if (!isConsequential(v, h)) continue;
        const { question, options, rationale } = phraseQuestion(v);
        out.push({ variable: v.name, question, options, rationale });
      }
      return out;
    },

    /**
     * Generate clarification questions across multiple hypotheses.
     * De-duplicates by variable name. Returns at most `max` questions
     * so the UI never floods the user.
     */
    forHypotheses(hs: ArchitectHypothesis[], max = 3): ClarificationQuestion[] {
      const seen = new Set<string>();
      const out: ClarificationQuestion[] = [];
      for (const h of hs) {
        for (const q of this.forHypothesis(h)) {
          if (seen.has(q.variable)) continue;
          seen.add(q.variable);
          out.push(q);
          if (out.length >= max) return out;
        }
      }
      return out;
    },
  };
}
