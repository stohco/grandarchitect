/**
 * Target Resolver — multi-candidate target grounding
 *
 * When the user says "make that roof wider", the Architect must NOT
 * instantly modify the highest-salience object. It maintains candidate
 * hypotheses:
 *
 *   H1: Main hall roof       confidence 0.62
 *   H2: Gatehouse roof       confidence 0.25
 *   H3: Shrine roof          confidence 0.13
 *
 * It highlights H1 and asks whether that is the intended target rather
 * than committing prematurely.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type { TargetCandidate } from '../types';
import type { EntityId } from '../../../kernel/types';

// ============================================================================
// Entity descriptor (what the resolver queries)
// ============================================================================

export interface ResolvableEntity {
  entityId: EntityId;
  label: string;
  type: string;
  subtype?: string;
  tags: string[];
  position: [number, number, number];
  salience: number;            // visual prominence 0..1
  recentlyMentioned: boolean;
  inCurrentSelection: boolean;
}

// ============================================================================
// Target resolver
// ============================================================================

export interface TargetResolver {
  resolve(reference: string, candidates: ResolvableEntity[]): TargetCandidate[];
  confirm(candidateId: string, candidates: TargetCandidate[]): ResolvableEntity | null;
}

export function createTargetResolver(entities: ResolvableEntity[]): TargetResolver {
  const entityMap = new Map<string, ResolvableEntity>();
  for (const e of entities) entityMap.set(String(e.entityId), e);

  function resolve(reference: string, pool: ResolvableEntity[]): TargetCandidate[] {
    const ref = reference.toLowerCase().trim();
    const results: TargetCandidate[] = [];
    let counter = 0;

    function nextId(): string {
      return String.fromCharCode(65 + (counter++ % 26));
    }

    // Strategy 1: exact label match
    for (const e of pool) {
      if (e.label.toLowerCase() === ref) {
        results.push({
          candidateId: nextId(),
          entityId: e.entityId,
          label: e.label,
          confidence: 0.9,
          rationale: 'Exact label match',
        });
      }
    }

    // Strategy 2: label contains reference
    if (results.length === 0) {
      for (const e of pool) {
        if (e.label.toLowerCase().includes(ref)) {
          let conf = 0.65;
          if (e.recentlyMentioned) conf += 0.1;
          if (e.inCurrentSelection) conf += 0.15;
          if (e.salience > 0.7) conf += 0.05;
          results.push({
            candidateId: nextId(),
            entityId: e.entityId,
            label: e.label,
            confidence: Math.min(0.95, conf),
            rationale: 'Label contains reference' +
              (e.recentlyMentioned ? ' + recently mentioned' : '') +
              (e.inCurrentSelection ? ' + in selection' : ''),
          });
        }
      }
    }

    // Strategy 3: type/subtype match
    if (results.length === 0) {
      for (const e of pool) {
        if (e.type === ref || e.subtype === ref) {
          let conf = 0.5;
          if (e.recentlyMentioned) conf += 0.1;
          if (e.inCurrentSelection) conf += 0.2;
          if (e.salience > 0.7) conf += 0.1;
          results.push({
            candidateId: nextId(),
            entityId: e.entityId,
            label: e.label,
            confidence: Math.min(0.85, conf),
            rationale: `Type match (${e.type})` +
              (e.recentlyMentioned ? ' + recently mentioned' : '') +
              (e.inCurrentSelection ? ' + in selection' : ''),
          });
        }
      }
    }

    // Strategy 4: tag match
    if (results.length === 0) {
      for (const e of pool) {
        if (e.tags.some(t => t.toLowerCase() === ref)) {
          let conf = 0.45;
          if (e.recentlyMentioned) conf += 0.1;
          if (e.inCurrentSelection) conf += 0.2;
          results.push({
            candidateId: nextId(),
            entityId: e.entityId,
            label: e.label,
            confidence: Math.min(0.8, conf),
            rationale: `Tag match (${ref})`,
          });
        }
      }
    }

    // Strategy 5: salience-based fallback (no linguistic match)
    if (results.length === 0 && pool.length > 0) {
      const sorted = [...pool].sort((a, b) => {
        // Prefer in-selection, then recently-mentioned, then salience
        if (a.inCurrentSelection !== b.inCurrentSelection) return b.inCurrentSelection ? 1 : -1;
        if (a.recentlyMentioned !== b.recentlyMentioned) return b.recentlyMentioned ? 1 : -1;
        return b.salience - a.salience;
      });
      const top = sorted.slice(0, 3);
      for (const e of top) {
        let conf = 0.2 + e.salience * 0.15;
        if (e.inCurrentSelection) conf += 0.15;
        if (e.recentlyMentioned) conf += 0.1;
        results.push({
          candidateId: nextId(),
          entityId: e.entityId,
          label: e.label,
          confidence: Math.min(0.5, conf),
          rationale: 'Salience fallback' +
            (e.inCurrentSelection ? ' + in selection' : '') +
            (e.recentlyMentioned ? ' + recently mentioned' : ''),
        });
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    // Flag whether confirmation is needed
    return results;
  }

  function confirm(candidateId: string, candidates: TargetCandidate[]): ResolvableEntity | null {
    const c = candidates.find(c => c.candidateId === candidateId);
    if (!c || !c.entityId) return null;
    return entityMap.get(String(c.entityId)) ?? null;
  }

  return { resolve, confirm };
}

// ============================================================================
// Disambiguation threshold
// ============================================================================

/**
 * If the top candidate's confidence is less than `threshold` above the
 * second candidate's, the Architect must ask for clarification rather
 * than auto-committing.
 */
export function needsDisambiguation(candidates: TargetCandidate[], threshold = 0.2): boolean {
  if (candidates.length < 2) return false;
  return (candidates[0].confidence - candidates[1].confidence) < threshold;
}
