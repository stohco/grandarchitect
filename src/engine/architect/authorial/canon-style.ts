/**
 * Canon & Style — Compiled Bible into Machine-Readable Truth
 * ==========================================================
 *
 * The verbose Authorial Source Bible remains for humans.
 * This compiler produces atomic, cross-linked records the engine can reason over.
 *
 * Truth layers:
 *   1. Authorial truth (what is actually true)
 *   2. World-state truth (what has occurred in this save)
 *   3. Institutional truth (what a sect/dynasty records)
 *   4. Character knowledge (what one person knows)
 *   5. Rumor and propaganda (circulating claims)
 *   6. Mystery (deliberately hidden)
 *   7. Narrative framing (how a scene should feel)
 *
 * The Grand Architect can inspect all seven. NPCs receive only
 * perspective-appropriate knowledge.
 */

// ---------------------------------------------------------------------------
// Canon Rules
// ---------------------------------------------------------------------------

export type CanonDomain =
  | 'cosmology' | 'history' | 'cultivation' | 'culture'
  | 'character' | 'geography' | 'institution' | 'artifact' | 'narrative';

export type CanonAuthority =
  | 'hard-canon' | 'project-canon' | 'regional-canon'
  | 'local-truth' | 'soft-guidance' | 'rumor' | 'deliberate-uncertainty';

export type CanonVisibility =
  | 'authorial-only' | 'world-observable' | 'faction-known'
  | 'character-known' | 'rumor';

export type CanonOverridePolicy =
  | 'forbidden' | 'requires-retcon' | 'requires-explicit-exception' | 'softly-overridable';

export interface CanonScope {
  cosmological?: string;
  realm?: string;
  region?: string;
  faction?: string;
  culture?: string;
  location?: string;
  character?: string;
  era?: string;
}

export interface WorldTime {
  era: string;
  year: number;
  description: string;
}

export interface BibleReference {
  document: string;
  section: string;
  paragraph?: string;
}

export interface CanonRule {
  ruleId: string;
  title: string;
  statement: string;

  domain: CanonDomain;
  authority: CanonAuthority;
  scope: CanonScope;
  validFrom?: WorldTime;
  validUntil?: WorldTime;

  provenance: BibleReference[];
  supersedes?: string[];
  conflictsWith?: string[];

  visibility: CanonVisibility;
  overridePolicy: CanonOverridePolicy;
}

// ---------------------------------------------------------------------------
// Style Constraints
// ---------------------------------------------------------------------------

export type StyleCategory =
  | 'shape-language' | 'proportion' | 'silhouette' | 'palette'
  | 'material' | 'surface-detail' | 'lighting' | 'atmosphere'
  | 'composition' | 'animation' | 'vfx' | 'ui' | 'cultural-motif';

export type StyleInheritance = 'inherit' | 'replace' | 'merge' | 'subtract';

export interface StyleScope {
  project?: boolean;
  cosmology?: string;
  realm?: string;
  region?: string;
  faction?: string;
  culture?: string;
  assetFamily?: string;
  location?: string;
  character?: string;
  scene?: string;
}

export interface StyleConstraint {
  constraintId: string;
  category: StyleCategory;
  requirement: string;
  negativeConstraints: string[];

  scope: StyleScope;
  priority: number;
  inheritance: StyleInheritance;

  validation: StyleValidation;
  provenance: BibleReference[];
}

export type StyleValidation =
  | { type: 'deterministic'; check: string }
  | { type: 'visual'; description: string }
  | { type: 'human-review'; reason: string };

// ---------------------------------------------------------------------------
// Creative Context Packet
// ---------------------------------------------------------------------------

export interface CreativeContextPacket {
  requestId: string;

  userIntent: string;
  interpretedIntent: AuthorialIntent;

  hardCanon: CanonRule[];
  applicableStyle: StyleConstraint[];

  narrativeContext: NarrativeContext;
  historicalContext: HistoricalContext;
  culturalContext: CulturalContext;

  references: VisualReference[];
  acceptedPrecedents: AssetReference[];

  forbiddenPatterns: string[];
  requiredMotifs: string[];

  technicalBudget: TechnicalBudget;
  gameplayRequirements: GameplayRequirement[];

  unresolvedQuestions: ContextQuestion[];
  contradictions: ContextConflict[];

  contextHash: string;
}

export interface AuthorialIntent {
  primaryIntent: string;
  emotionalIntent: string;
  narrativeIntent?: string;
  spatialIntent?: string;
  implicitRequirements: string[];
  confidence: number;
}

export interface NarrativeContext {
  activePromises: NarrativePromise[];
  thematicMotifs: string[];
  characterArcs: string[];
}

export interface NarrativePromise {
  promiseId: string;
  description: string;
  status: 'seeded' | 'developing' | 'payoff-ready' | 'fulfilled' | 'abandoned';
  introducedAt: string;
  possiblePayoffs: string[];
}

export interface HistoricalContext {
  era: string;
  relevantEvents: HistoricalEvent[];
  regionalHistory: string;
}

export interface HistoricalEvent {
  eventId: string;
  description: string;
  timestamp: WorldTime;
  consequences: string[];
}

export interface CulturalContext {
  culture: string;
  faction: string;
  practices: string[];
  prohibitions: string[];
  aestheticPreferences: string[];
}

export interface VisualReference {
  referenceId: string;
  type: 'image' | 'description' | 'existing-asset';
  value: string;
  relevance: string;
}

export interface AssetReference {
  assetId: string;
  revision: number;
  reason: string;
}

export interface TechnicalBudget {
  maxTriangles: number;
  maxDrawCalls: number;
  maxTextureMemory: number;
  targetFps: number;
  qualityProfile: 'legacy' | 'mainstream' | 'ultra';
}

export interface GameplayRequirement {
  requirementId: string;
  description: string;
  category: 'traversal' | 'combat' | 'interaction' | 'narrative' | 'economic';
}

export interface ContextQuestion {
  questionId: string;
  question: string;
  options: string[];
}

export interface ContextConflict {
  conflictId: string;
  description: string;
  rule1: string;
  rule2: string;
  resolution?: string;
}

// ---------------------------------------------------------------------------
// Creative Context Resolver (with explainable traces)
// ---------------------------------------------------------------------------
//
// The resolver now produces a ResolutionTrace that explains WHY each canon
// rule and style constraint was included, WHY each was overridden (or not),
// and which approval flags fired. This is required for the auditor's
// "explainable creative context resolution" milestone.

import { loadCompiledBible, type CompiledCanonRule, type CompiledStyleConstraint } from './bible-compiler';

export interface ResolutionTrace {
  scope: StyleScope;
  intent: AuthorialIntent;
  canonConsidered: Array<{ ruleId: string; included: boolean; reason: string }>;
  styleConsidered: Array<{ constraintId: string; included: boolean; reason: string }>;
  overridesApplied: Array<{ constraintId: string; overriddenBy: string; reason: string }>;
  approvalFlags: string[];
  notes: string[];
}

export class CreativeContextResolver {
  private canonRules: Map<string, CompiledCanonRule> = new Map();
  private styleConstraints: Map<string, CompiledStyleConstraint> = new Map();
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const { canon, style } = await loadCompiledBible();
    for (const rule of canon) this.canonRules.set(rule.ruleId, rule);
    for (const c of style) this.styleConstraints.set(c.constraintId, c);
  }

  registerCanonRule(rule: CanonRule): void {
    this.canonRules.set(rule.ruleId, rule as CompiledCanonRule);
  }

  registerStyleConstraint(constraint: StyleConstraint): void {
    this.styleConstraints.set(constraint.constraintId, constraint as CompiledStyleConstraint);
  }

  /**
   * Resolve applicable canon and style for a given scope.
   * Returns BOTH the CreativeContextPacket AND a ResolutionTrace explaining
   * every inclusion / exclusion / override.
   */
  async resolve(scope: StyleScope, intent: AuthorialIntent): Promise<{
    packet: CreativeContextPacket;
    trace: ResolutionTrace;
  }> {
    await this.ensureLoaded();
    const { applicableStyle, styleTrace } = this.resolveStyle(scope);
    const { hardCanon, canonTrace } = this.resolveCanon(scope);
    const overrides = this.computeOverrides(applicableStyle);
    const approvalFlags = this.computeApprovalFlags(hardCanon, applicableStyle, intent);
    const contextHash = this.computeHash(scope, intent);

    const packet: CreativeContextPacket = {
      requestId: `ctx-${Date.now().toString(36)}`,
      userIntent: intent.primaryIntent,
      interpretedIntent: intent,
      hardCanon,
      applicableStyle,
      narrativeContext: { activePromises: [], thematicMotifs: [], characterArcs: [] },
      historicalContext: { era: '', relevantEvents: [], regionalHistory: '' },
      culturalContext: { culture: '', faction: '', practices: [], prohibitions: [], aestheticPreferences: [] },
      references: [],
      acceptedPrecedents: [],
      forbiddenPatterns: applicableStyle
        .filter((s) => s.negativeConstraints.length > 0)
        .flatMap((s) => s.negativeConstraints),
      requiredMotifs: applicableStyle
        .filter((s) => s.priority >= 5)
        .map((s) => s.requirement),
      technicalBudget: {
        maxTriangles: 100_000,
        maxDrawCalls: 500,
        maxTextureMemory: 128 * 1024 * 1024,
        targetFps: 60,
        qualityProfile: 'mainstream',
      },
      gameplayRequirements: [],
      unresolvedQuestions: [],
      contradictions: [],
      contextHash,
    };

    const trace: ResolutionTrace = {
      scope,
      intent,
      canonConsidered: canonTrace,
      styleConsidered: styleTrace,
      overridesApplied: overrides,
      approvalFlags,
      notes: [
        `Resolved ${hardCanon.length} canon rules and ${applicableStyle.length} style constraints for scope.`,
        overrides.length > 0
          ? `${overrides.length} override(s) applied via higher-priority constraints.`
          : 'No overrides applied — all constraints compatible.',
      ],
    };

    return { packet, trace };
  }

  private resolveStyle(scope: StyleScope): {
    applicableStyle: StyleConstraint[];
    styleTrace: Array<{ constraintId: string; included: boolean; reason: string }>;
  } {
    const resolved: StyleConstraint[] = [];
    const styleTrace: Array<{ constraintId: string; included: boolean; reason: string }> = [];

    for (const constraint of this.styleConstraints.values()) {
      const matches = this.scopeMatches(constraint.scope, scope);
      if (matches) {
        resolved.push(constraint);
        styleTrace.push({
          constraintId: constraint.constraintId,
          included: true,
          reason: `Scope match: project=${constraint.scope.project ?? false}, assetFamily=${constraint.scope.assetFamily ?? 'n/a'}`,
        });
      } else {
        styleTrace.push({
          constraintId: constraint.constraintId,
          included: false,
          reason: `Scope mismatch — constraint targets ${JSON.stringify(constraint.scope)}`,
        });
      }
    }
    return { applicableStyle: resolved.sort((a, b) => b.priority - a.priority), styleTrace };
  }

  private resolveCanon(scope: StyleScope): {
    hardCanon: CanonRule[];
    canonTrace: Array<{ ruleId: string; included: boolean; reason: string }>;
  } {
    const resolved: CanonRule[] = [];
    const canonTrace: Array<{ ruleId: string; included: boolean; reason: string }> = [];

    for (const rule of this.canonRules.values()) {
      const matches = this.scopeMatches(rule.scope, scope);
      if (matches) {
        resolved.push(rule);
        canonTrace.push({
          ruleId: rule.ruleId,
          included: true,
          reason: `Scope match: authority=${rule.authority}, modality=${(rule as CompiledCanonRule).modality ?? 'unknown'}`,
        });
      } else {
        canonTrace.push({
          ruleId: rule.ruleId,
          included: false,
          reason: `Scope mismatch — rule targets ${JSON.stringify(rule.scope)}`,
        });
      }
    }
    return { hardCanon: resolved, canonTrace };
  }

  /**
   * Compute overrides: if a higher-priority constraint's negativeConstraints
   * directly contradict a lower-priority constraint's requirement, the lower
   * one is overridden.
   */
  private computeOverrides(style: StyleConstraint[]): Array<{ constraintId: string; overriddenBy: string; reason: string }> {
    const overrides: Array<{ constraintId: string; overriddenBy: string; reason: string }> = [];
    for (let i = 0; i < style.length; i++) {
      for (let j = i + 1; j < style.length; j++) {
        const high = style[i];
        const low = style[j];
        if (high.priority <= low.priority) continue;
        for (const neg of high.negativeConstraints) {
          if (low.requirement.toLowerCase().includes(neg.toLowerCase())) {
            overrides.push({
              constraintId: low.constraintId,
              overriddenBy: high.constraintId,
              reason: `Higher-priority "${high.constraintId}" forbids "${neg}", overriding "${low.constraintId}".`,
            });
          }
        }
      }
    }
    return overrides;
  }

  private computeApprovalFlags(
    canon: CanonRule[],
    style: StyleConstraint[],
    intent: AuthorialIntent,
  ): string[] {
    const flags: string[] = [];
    // Flag any 'must' modality canon rule — these are hard requirements.
    for (const rule of canon) {
      const compiled = rule as CompiledCanonRule;
      if (compiled.modality === 'must' && rule.authority === 'hard-canon') {
        flags.push(`approval-required:hard-canon:${rule.ruleId}`);
      }
      if (compiled.modality === 'disputed') {
        flags.push(`approval-required:disputed:${rule.ruleId}`);
      }
    }
    // Flag any 'must' modality style constraint.
    for (const c of style) {
      const compiled = c as CompiledStyleConstraint;
      if (compiled.modality === 'must') {
        flags.push(`approval-required:style-must:${c.constraintId}`);
      }
    }
    // Flag low-confidence intents.
    if (intent.confidence < 0.5) {
      flags.push('approval-required:low-intent-confidence');
    }
    return flags;
  }

  private scopeMatches(ruleScope: CanonScope, requestScope: StyleScope): boolean {
    if (ruleScope.realm && requestScope.realm && ruleScope.realm !== requestScope.realm) return false;
    if (ruleScope.region && requestScope.region && ruleScope.region !== requestScope.region) return false;
    if (ruleScope.faction && requestScope.faction && ruleScope.faction !== requestScope.faction) return false;
    if (ruleScope.culture && requestScope.culture && ruleScope.culture !== requestScope.culture) return false;
    return true;
  }

  private computeHash(scope: StyleScope, intent: AuthorialIntent): string {
    const content = JSON.stringify({ scope, intent: intent.primaryIntent });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}

// Singleton
let resolverInstance: CreativeContextResolver | null = null;

export function getCreativeContextResolver(): CreativeContextResolver {
  if (!resolverInstance) {
    resolverInstance = new CreativeContextResolver();
  }
  return resolverInstance;
}

/**
 * Test-only: reset singleton.
 */
export function __resetCreativeContextResolverSingleton(): void {
  resolverInstance = null;
}
