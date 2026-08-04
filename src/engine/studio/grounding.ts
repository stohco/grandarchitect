/**
 * Visual Grounding System
 *
 * Implements doc 50 §2. Resolves natural-language references like
 * "that building" or "the cliff behind the shrine" to specific
 * engine objects via a provenance chain. Provides confidence
 * levels and never silently modifies a low-confidence guess.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  GroundingResult,
  GroundingCandidate,
  ProvenanceLink,
  ConfidenceLevel,
  EntityId,
  PluginId,
  Vec3,
} from './types';

// ============================================================================
// Entity index (what the grounding system queries)
// ============================================================================

export interface GroundableEntity {
  entityId: EntityId;
  label: string;              // 'Eastern gatehouse'
  type: string;               // 'building.gatehouse'
  position: Vec3;
  renderPrimitiveId?: string;
  presentationObjectId?: string;
  assetInstanceId?: string;
  sourceAssetHash?: string;
  owningPluginId?: PluginId;
  generatedBy?: string;
  editableProperties: string[];
  tags: string[];
}

export interface GroundingIndex {
  register(entity: GroundableEntity): void;
  unregister(entityId: EntityId): boolean;
  get(entityId: EntityId): GroundableEntity | undefined;
  list(): GroundableEntity[];
  findByLabel(label: string): GroundableEntity[];
  findByType(type: string): GroundableEntity[];
  findByTag(tag: string): GroundableEntity[];
  findByPosition(center: Vec3, radius: number): GroundableEntity[];
  clear(): void;
}

export function createGroundingIndex(): GroundingIndex {
  const entities = new Map<string, GroundableEntity>();

  function key(eid: EntityId): string { return String(eid); }

  return {
    register(entity: GroundableEntity) {
      entities.set(key(entity.entityId), entity);
    },
    unregister(entityId: EntityId): boolean {
      return entities.delete(key(entityId));
    },
    get(entityId: EntityId): GroundableEntity | undefined {
      return entities.get(key(entityId));
    },
    list(): GroundableEntity[] {
      return Array.from(entities.values());
    },
    findByLabel(label: string): GroundableEntity[] {
      const lower = label.toLowerCase();
      return Array.from(entities.values()).filter(e =>
        e.label.toLowerCase().includes(lower)
      );
    },
    findByType(type: string): GroundableEntity[] {
      return Array.from(entities.values()).filter(e => e.type === type);
    },
    findByTag(tag: string): GroundableEntity[] {
      return Array.from(entities.values()).filter(e => e.tags.includes(tag));
    },
    findByPosition(center: Vec3, radius: number): GroundableEntity[] {
      const r2 = radius * radius;
      return Array.from(entities.values()).filter(e => {
        const dx = e.position.x - center.x;
        const dy = e.position.y - center.y;
        const dz = e.position.z - center.z;
        return dx * dx + dy * dy + dz * dz <= r2;
      });
    },
    clear() { entities.clear(); },
  };
}

// ============================================================================
// Grounding resolver
// ============================================================================

export interface GroundingResolver {
  resolve(query: string, context?: GroundingContext): GroundingResult;
  confirm(candidateId: string): GroundableEntity | null;
  getHistory(): GroundingResult[];
  clearHistory(): void;
}

export interface GroundingContext {
  // The currently anchored entity (if any)
  anchoredEntityId?: EntityId;
  // The player/camera position (for proximity-based disambiguation)
  observerPosition?: Vec3;
  // The direction the observer is looking
  observerForward?: Vec3;
  // Recent entities mentioned in conversation
  recentEntityIds?: EntityId[];
}

export function createGroundingResolver(index: GroundingIndex): GroundingResolver {
  const history: GroundingResult[] = [];
  let lastResult: GroundingResult | null = null;
  let counter = 0;

  function candidateId(): string {
    return String.fromCharCode(65 + (counter++ % 26));  // A, B, C...
  }

  function toConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.4) return 'medium';
    return 'low';
  }

  function buildProvenance(entity: GroundableEntity): ProvenanceLink {
    return {
      renderPrimitiveId: entity.renderPrimitiveId,
      presentationObjectId: entity.presentationObjectId,
      runtimeEntityId: entity.entityId,
      assetInstanceId: entity.assetInstanceId,
      sourceAssetHash: entity.sourceAssetHash,
      owningPluginId: entity.owningPluginId,
      generatedBy: entity.generatedBy,
      worldLocation: { ...entity.position },
      editableProperties: [...entity.editableProperties],
    };
  }

  return {
    resolve(query: string, context?: GroundingContext): GroundingResult {
      counter = 0;
      const candidates: GroundingCandidate[] = [];
      const queryLower = query.toLowerCase().trim();

      // Strategy 1: label match
      const labelMatches = index.findByLabel(queryLower);
      for (const e of labelMatches) {
        // Exact label match → high confidence base
        const isExact = e.label.toLowerCase() === queryLower;
        let confidence = isExact ? 0.85 : 0.6;
        // Boost if anchored or recent
        if (context?.anchoredEntityId === e.entityId) confidence += 0.1;
        if (context?.recentEntityIds?.includes(e.entityId)) confidence += 0.05;
        // Boost if near observer
        if (context?.observerPosition) {
          const dx = e.position.x - context.observerPosition.x;
          const dy = e.position.y - context.observerPosition.y;
          const dz = e.position.z - context.observerPosition.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 50) confidence += 0.05;
        }
        candidates.push({
          candidateId: candidateId(),
          label: e.label,
          confidence: Math.min(1, confidence),
          provenance: buildProvenance(e),
        });
      }

      // Strategy 2: type match (e.g. "building" → all buildings)
      if (candidates.length === 0) {
        const typeMatches = index.findByType(queryLower);
        for (const e of typeMatches.slice(0, 5)) {
          candidates.push({
            candidateId: candidateId(),
            label: e.label,
            confidence: 0.5,
            provenance: buildProvenance(e),
          });
        }
      }

      // Strategy 3: tag match
      if (candidates.length === 0) {
        const tagMatches = index.findByTag(queryLower);
        for (const e of tagMatches.slice(0, 5)) {
          candidates.push({
            candidateId: candidateId(),
            label: e.label,
            confidence: 0.4,
            provenance: buildProvenance(e),
          });
        }
      }

      // Sort by confidence descending
      candidates.sort((a, b) => b.confidence - a.confidence);

      const best = candidates[0];
      const confidenceLevel = best ? toConfidenceLevel(best.confidence) : 'low';
      const requiresConfirmation = confidenceLevel !== 'high';

      const result: GroundingResult = {
        query,
        candidates,
        bestCandidate: best,
        confidenceLevel,
        requiresConfirmation,
      };
      lastResult = result;
      history.push(result);
      return result;
    },

    confirm(candidateId: string): GroundableEntity | null {
      if (!lastResult) return null;
      const candidate = lastResult.candidates.find(c => c.candidateId === candidateId);
      if (!candidate) return null;
      return index.get(candidate.provenance.runtimeEntityId!) ?? null;
    },

    getHistory(): GroundingResult[] {
      return [...history];
    },

    clearHistory(): void {
      history.length = 0;
      lastResult = null;
    },
  };
}

// ============================================================================
// Context anchor manager
// ============================================================================

export interface ContextAnchorManager {
  anchor(entityId: EntityId): void;
  clearAnchor(): void;
  getAnchor(): EntityId | null;
  addRecent(entityId: EntityId): void;
  getRecent(): EntityId[];
  buildContext(observerPosition?: Vec3, observerForward?: Vec3): GroundingContext;
}

export function createContextAnchorManager(): ContextAnchorManager {
  let anchor: EntityId | null = null;
  const recent: EntityId[] = [];
  const MAX_RECENT = 10;

  return {
    anchor(entityId: EntityId) {
      anchor = entityId;
      // Add to recent (avoid duplicates)
      const idx = recent.findIndex(e => String(e) === String(entityId));
      if (idx >= 0) recent.splice(idx, 1);
      recent.unshift(entityId);
      if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    },
    clearAnchor() { anchor = null; },
    getAnchor(): EntityId | null { return anchor; },
    addRecent(entityId: EntityId) {
      const idx = recent.findIndex(e => String(e) === String(entityId));
      if (idx >= 0) recent.splice(idx, 1);
      recent.unshift(entityId);
      if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
    },
    getRecent(): EntityId[] { return [...recent]; },
    buildContext(observerPosition?: Vec3, observerForward?: Vec3): GroundingContext {
      return {
        anchoredEntityId: anchor ?? undefined,
        observerPosition,
        observerForward,
        recentEntityIds: [...recent],
      };
    },
  };
}
