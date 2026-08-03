/**
 * Capability Graph — machine-readable capability requirements vs implementation.
 *
 * Desired capability graph − implemented capability graph = missing work.
 * The AI can query this to identify what's absent, partial, fragile, or unvalidated.
 */

import type { CapabilityRequirement } from './types';

export interface CapabilityGraph {
  register(req: CapabilityRequirement): void;
  get(id: string): CapabilityRequirement | undefined;
  list(): CapabilityRequirement[];
  gapAnalysis(): GapReport;
  findByState(state: CapabilityRequirement['implementationState']): CapabilityRequirement[];
}

export interface GapReport {
  total: number;
  unplanned: number;
  designed: number;
  partial: number;
  implemented: number;
  validated: number;
  blocked: number;
  missing: CapabilityRequirement[]; // unplanned + designed + partial + blocked
  ready: CapabilityRequirement[];    // implemented but not validated
}

export function createCapabilityGraph(): CapabilityGraph {
  const requirements = new Map<string, CapabilityRequirement>();

  return {
    register(req) {
      requirements.set(req.id, req);
    },

    get(id) {
      return requirements.get(id);
    },

    list() {
      return Array.from(requirements.values());
    },

    gapAnalysis() {
      const all = Array.from(requirements.values());
      const byState = (state: string) => all.filter(r => r.implementationState === state);

      const unplanned = byState('unplanned');
      const designed = byState('designed');
      const partial = byState('partial');
      const implemented = byState('implemented');
      const validated = byState('validated');
      const blocked = byState('blocked');

      return {
        total: all.length,
        unplanned: unplanned.length,
        designed: designed.length,
        partial: partial.length,
        implemented: implemented.length,
        validated: validated.length,
        blocked: blocked.length,
        missing: [...unplanned, ...designed, ...partial, ...blocked],
        ready: implemented,
      };
    },

    findByState(state) {
      return Array.from(requirements.values()).filter(r => r.implementationState === state);
    },
  };
}
