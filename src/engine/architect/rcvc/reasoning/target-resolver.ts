/**
 * Target resolver.
 *
 * Given a free-text request and the current world context, decide which
 * entities / systems / regions the request might be about. The resolver
 * is intentionally conservative: if it cannot pin the target down to a
 * single candidate, it asks for disambiguation.
 */

import type { HypothesisTarget } from '../types';

// ============================================================================
// Context shape (kept loose — the editor passes what it has)
// ============================================================================

export interface TargetResolverContext {
  /** All entity ids + labels currently in the world. */
  entities?: Array<{ id: number; kind: string; name: string }>;
  /** Selected entity ids (from the editor's selection). */
  selectedIds?: number[];
  /** Regions in the world (e.g. "south-paddies"). */
  regions?: Array<{ id: string; name: string }>;
  /** Engine systems (e.g. "cultivation", "ecology"). */
  systems?: string[];
}

export interface TargetResolverResult {
  /** Resolved targets (may be more than one — that triggers disambiguation). */
  targets: HypothesisTarget[];
  /** Whether the resolver needs the user to disambiguate. */
  needsDisambiguation: boolean;
  /** Why disambiguation is needed (if it is). */
  reason?: string;
}

// ============================================================================
// Pattern table — maps request substrings to candidate target kinds
// ============================================================================

interface TargetPattern {
  match: RegExp;
  kind: HypothesisTarget['kind'];
  /** Returns a target ref from the match, or null to fall through. */
  resolve: (m: RegExpMatchArray, ctx: TargetResolverContext) => HypothesisTarget | null;
}

const PATTERNS: TargetPattern[] = [
  // Selection-relative pronouns: "this", "that", "it", "them"
  {
    match: /\b(this|that|it|them|these|those)\b/i,
    kind: 'entity',
    resolve: (_m, ctx) => {
      const ids = ctx.selectedIds ?? [];
      if (ids.length === 0) return null;
      const ent = (ctx.entities ?? []).find(e => e.id === ids[0]);
      return {
        ref: `entity:${ids[0]}`,
        kind: 'entity',
        label: ent ? ent.name : `entity #${ids[0]}`,
      };
    },
  },
  // "all households"
  {
    match: /\ball households\b/i,
    kind: 'wildcard',
    resolve: () => ({ ref: 'kind:household', kind: 'wildcard', label: 'all households' }),
  },
  // "the shrine" / "the hall" / "the mill"
  {
    match: /\bthe (lineage hall|hall|shrine|mill|dock|graveyard|paddy|garden)\b/i,
    kind: 'entity',
    resolve: (m, ctx) => {
      const label = m[1].toLowerCase();
      const kindMap: Record<string, string> = {
        'lineage hall': 'lineage_hall',
        hall: 'lineage_hall',
        shrine: 'spirit_shrine',
        mill: 'mill',
        dock: 'dock',
        graveyard: 'graveyard',
        paddy: 'paddy',
        garden: 'dryland_garden',
      };
      const kind = kindMap[label];
      const ent = (ctx.entities ?? []).find(e => e.kind === kind);
      if (!ent) return null;
      return { ref: `entity:${ent.id}`, kind: 'entity', label: ent.name };
    },
  },
  // "south paddies", "north gardens", etc. — region wildcards
  {
    match: /\b(south|north|east|west|south-east|south-west|north-east|north-west)\b/i,
    kind: 'region',
    resolve: (m, ctx) => {
      const dir = m[1].toLowerCase();
      const region = (ctx.regions ?? []).find(r => r.id.includes(dir) || r.name.toLowerCase().includes(dir));
      return {
        ref: region ? `region:${region.id}` : `region:${dir}`,
        kind: 'region',
        label: region ? region.name : `${dir} region`,
      };
    },
  },
  // Engine systems: "cultivation", "ecology", "economy"
  {
    match: /\b(cultivation|ecology|economy|combat|narrative|weather|terrain|formation)\b/i,
    kind: 'system',
    resolve: (m, _ctx) => ({
      ref: `system:${m[1].toLowerCase()}`,
      kind: 'system',
      label: m[1].toLowerCase(),
    }),
  },
];

// ============================================================================
// Resolver
// ============================================================================

export function createTargetResolver(ctx: TargetResolverContext) {
  return {
    resolve(request: string): TargetResolverResult {
      const targets: HypothesisTarget[] = [];
      const seen = new Set<string>();
      for (const p of PATTERNS) {
        const m = request.match(p.match);
        if (!m) continue;
        const t = p.resolve(m, ctx);
        if (!t) continue;
        if (seen.has(t.ref)) continue;
        seen.add(t.ref);
        targets.push(t);
      }
      // If nothing matched but we have a selection, treat the request as
      // targeting the selection.
      if (targets.length === 0 && (ctx.selectedIds ?? []).length > 0) {
        const id = ctx.selectedIds![0];
        const ent = (ctx.entities ?? []).find(e => e.id === id);
        targets.push({
          ref: `entity:${id}`,
          kind: 'entity',
          label: ent ? ent.name : `entity #${id}`,
        });
      }

      // Disambiguation is required when:
      //   (a) we resolved to multiple candidates of different kinds, OR
      //   (b) the request contains an explicit selection pronoun but
      //       nothing is currently selected.
      const kinds = new Set(targets.map(t => t.kind));
      const needsDisambiguation = kinds.size > 1;
      const reason = needsDisambiguation
        ? `Request references ${targets.length} candidate targets of ${kinds.size} different kinds.`
        : undefined;

      return { targets, needsDisambiguation, reason };
    },
  };
}

/** Free function form, for callers that don't want to hold a resolver. */
export function needsDisambiguation(request: string, ctx: TargetResolverContext): boolean {
  return createTargetResolver(ctx).resolve(request).needsDisambiguation;
}
