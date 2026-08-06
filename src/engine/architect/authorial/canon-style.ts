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
// Creative Context Resolver
// ---------------------------------------------------------------------------

export class CreativeContextResolver {
  private canonRules: Map<string, CanonRule> = new Map();
  private styleConstraints: Map<string, StyleConstraint> = new Map();

  registerCanonRule(rule: CanonRule): void {
    this.canonRules.set(rule.ruleId, rule);
  }

  registerStyleConstraint(constraint: StyleConstraint): void {
    this.styleConstraints.set(constraint.constraintId, constraint);
  }

  /**
   * Resolve applicable canon and style for a given scope.
   * Style inherits through: project → cosmology → realm → region →
   * culture/faction → asset family → location/character → scene → user request.
   */
  resolve(scope: StyleScope, intent: AuthorialIntent): CreativeContextPacket {
    const applicableStyle = this.resolveStyle(scope);
    const hardCanon = this.resolveCanon(scope);
    const contextHash = this.computeHash(scope, intent);

    return {
      requestId: `ctx-${Date.now().toString(36)}`,
      userIntent: intent.primaryIntent,
      interpretedIntent: intent,
      hardCanon,
      applicableStyle,
      narrativeContext: { activePromises: [], thematicMotifs: [] },
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
  }

  private resolveStyle(scope: StyleScope): StyleConstraint[] {
    const resolved: StyleConstraint[] = [];
    for (const constraint of this.styleConstraints.values()) {
      if (this.scopeMatches(constraint.scope, scope)) {
        resolved.push(constraint);
      }
    }
    return resolved.sort((a, b) => b.priority - a.priority);
  }

  private resolveCanon(scope: StyleScope): CanonRule[] {
    const resolved: CanonRule[] = [];
    for (const rule of this.canonRules.values()) {
      if (this.scopeMatches(rule.scope, scope)) {
        resolved.push(rule);
      }
    }
    return resolved;
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
