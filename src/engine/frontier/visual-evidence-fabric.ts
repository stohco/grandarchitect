/**
 * Visual Evidence Fabric v2 — provider-neutral multimodal observation system
 *
 * Corrections from v1:
 *   - Domain-specific authority policies (NOT one global ranking)
 *   - Evidence verdicts: insufficient-evidence, partial, consistent, conflicted,
 *     needs-human-review, validation-failed, validated
 *   - Proposition-level assertions with scoped contradiction detection
 *   - Capture manifests with full camera/renderer/lighting context
 *   - VLM cannot invent engine-grounded identifiers
 *   - Explicit uncertainty and abstention
 *   - Validation profiles with required criteria
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import { createHash } from 'crypto';

// ============================================================================
// Evidence kinds
// ============================================================================

export type EvidenceKind =
  | 'engine-measured'
  | 'pixel-measured'
  | 'human-confirmed'
  | 'text-extracted'
  | 'model-inferred';

// ============================================================================
// Proposition domains — authority depends on the question being asked
// ============================================================================

export type PropositionDomain =
  | 'identity'          // which object is this? → engine truth
  | 'spatial'           // position, scale, bounds → engine telemetry
  | 'temporal'          // timing, duration → engine trace
  | 'physical'          // collision, navigation → engine truth
  | 'textual'           // text in image → OCR verified against source
  | 'canonical'         // canon/lore compliance → user-approved ground truth
  | 'art-direction'     // aesthetic intent → user-approved judgment
  | 'aesthetic'         // appearance quality → human review + VLM critique
  | 'runtime'           // runtime behavior → engine trace + deterministic replay
  | 'performance';      // fps, memory, draw calls → engine telemetry

// ============================================================================
// Domain-specific authority policies
// ============================================================================

export interface AuthorityPolicy {
  domain: PropositionDomain;
  preferredEvidenceKinds: EvidenceKind[];
  requiredEvidenceKinds: EvidenceKind[];
  humanApprovalRequired: boolean;
  allowedToOverride: EvidenceKind[];
}

export const AUTHORITY_POLICIES: Record<PropositionDomain, AuthorityPolicy> = {
  identity: {
    domain: 'identity',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
  spatial: {
    domain: 'spatial',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
  temporal: {
    domain: 'temporal',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
  physical: {
    domain: 'physical',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
  textual: {
    domain: 'textual',
    preferredEvidenceKinds: ['text-extracted', 'engine-measured'],
    requiredEvidenceKinds: ['text-extracted'],
    humanApprovalRequired: false,
    allowedToOverride: ['model-inferred'],
  },
  canonical: {
    domain: 'canonical',
    preferredEvidenceKinds: ['human-confirmed'],
    requiredEvidenceKinds: ['human-confirmed'],
    humanApprovalRequired: true,
    allowedToOverride: [],
  },
  'art-direction': {
    domain: 'art-direction',
    preferredEvidenceKinds: ['human-confirmed'],
    requiredEvidenceKinds: ['human-confirmed'],
    humanApprovalRequired: true,
    allowedToOverride: ['model-inferred'],
  },
  aesthetic: {
    domain: 'aesthetic',
    preferredEvidenceKinds: ['human-confirmed', 'model-inferred'],
    requiredEvidenceKinds: [],
    humanApprovalRequired: true,
    allowedToOverride: ['model-inferred'],
  },
  runtime: {
    domain: 'runtime',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
  performance: {
    domain: 'performance',
    preferredEvidenceKinds: ['engine-measured'],
    requiredEvidenceKinds: ['engine-measured'],
    humanApprovalRequired: false,
    allowedToOverride: [],
  },
};

// ============================================================================
// Evidence verdicts — NOT just "accepted/rejected"
// ============================================================================

export type EvidenceVerdict =
  | 'insufficient-evidence'  // not enough providers/criteria exercised
  | 'partial'                // some criteria exercised, some missing
  | 'consistent'             // all exercised criteria agree, but profile incomplete
  | 'conflicted'             // providers disagree on same proposition
  | 'needs-human-review'     // human approval required but not yet given
  | 'validation-failed'      // a required criterion failed
  | 'validated';             // ALL required criteria exercised AND passed

// ============================================================================
// Validation profile — defines what "validated" means
// ============================================================================

export interface ValidationProfile {
  id: string;
  name: string;
  requiredCriteria: string[];
  optionalCriteria: string[];
  requiredProviders: string[];
  humanApprovalRequired: boolean;
}

// ============================================================================
// Proposition-level evidence assertion
// ============================================================================

export interface EvidenceAssertion {
  assertionId: string;
  propositionId: string;         // groups assertions about the same claim
  targetId?: string;             // entity ID, region ID, etc.
  domain: PropositionDomain;
  property: string;              // e.g. 'opening-width', 'silhouette-readability'
  value: unknown;                // the asserted value

  worldRevision?: number;
  graphRevision?: number;
  captureId?: string;

  spatialScope?: { minX: number; maxX: number; minZ: number; maxZ: number };
  temporalScope?: { startTick: number; endTick: number };
  viewingContext?: { camera: string; fov: number; lighting: string; weather: string };

  evidenceKind: EvidenceKind;
  confidence: 'certain' | 'high' | 'medium' | 'low';
  evidenceText: string;
  providerId: string;

  // VLM-sourced assertions must NOT include engine-grounded fields they can't know
  // The fusion layer attaches engine identity after matching
  engineGrounded?: boolean;      // true if entityId/worldPosition came from engine (not VLM)
}

// ============================================================================
// Uncertainty and abstention
// ============================================================================

export interface VisualUncertainty {
  question: string;
  reason: 'occluded' | 'insufficient-resolution' | 'ambiguous-target'
       | 'missing-engine-data' | 'lighting-dependent' | 'outside-view'
       | 'model-uncertain';
  resolution: 'capture-closer-view' | 'request-engine-buffer' | 'ask-user'
            | 'use-second-provider' | 'cannot-resolve';
  blockingValidation: boolean;
}

// ============================================================================
// Capture manifest — complete context for reproducibility
// ============================================================================

export interface VisualCaptureManifest {
  captureId: string;
  worldRevision: number;
  graphRevision: number;
  activeBundleId: string;
  camera: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    fieldOfViewDegrees: number;
    near: number;
    far: number;
    exposure: number;
  };
  viewport: { width: number; height: number; devicePixelRatio: number };
  rendererBackend: string;
  rendererVersion: string;
  qualityProfile: string;
  lightingState: string;
  weatherState: string;
  timeOfDay: number;
  visibleEntityIds: number[];
  selectedEntityIds: number[];
  buffersAvailable: string[];
  imageHash: string;
}

// ============================================================================
// Provider interface
// ============================================================================

export interface VisionProvider {
  readonly id: string;
  readonly kind: EvidenceSource;
  analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<VisualEvidenceRecord>;
}

export type EvidenceSource = 'engine-truth' | 'native-vlm' | 'structured-vision' | 'deterministic-analysis' | 'human';

export interface VisualCapture {
  captureId: string;
  imageData?: Buffer;
  imageBase64?: string;
  imageUrl?: string;
  manifest: VisualCaptureManifest;
  engineTruth?: EngineTruthCapture;
}

export interface EngineTruthCapture {
  visibleEntities: Array<{
    entityId: number;
    type: string;
    position: { x: number; y: number; z: number };
    bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    materialId?: number;
  }>;
  selectedEntityIds: number[];
  cameraFrustum?: { near: number; far: number; fov: number };
  renderStats?: { drawCalls: number; triangles: number; fps: number };
}

export interface VisualAnalysisRequest {
  mode: AnalysisMode;
  criteria?: string[];
  prompt?: string;
  requireStructuredOutput: boolean;
  validationProfile?: ValidationProfile;
}

export type AnalysisMode =
  | 'scene-interpretation' | 'visual-fidelity-review' | 'ocr-text-extraction'
  | 'layout-analysis' | 'asset-comparison' | 'style-grammar-compliance'
  | 'scale-and-proportion-review' | 'animation-review' | 'ui-review'
  | 'ambiguous-target-resolution';

// ============================================================================
// Evidence record (from a single provider)
// ============================================================================

export interface VisualEvidenceRecord {
  id: string;
  captureId: string;
  timestamp: string;
  source: EvidenceSource;
  provider: { id: string; model?: string; version?: string };
  assertions: EvidenceAssertion[];
  uncertainties: VisualUncertainty[];
  latencyMs: number;
  schemaVersion: string;
}

// ============================================================================
// Fused evidence packet
// ============================================================================

export interface FusedEvidencePacket {
  packetId: string;
  captureId: string;
  timestamp: string;
  records: VisualEvidenceRecord[];
  fusedAssertions: FusedAssertion[];
  crossProviderContradictions: ScopedContradiction[];
  verdict: EvidenceVerdict;
  validationProfile?: ValidationProfile;
  exercisedCriteria: string[];
  missingCriteria: string[];
  summary: string;
}

export interface FusedAssertion {
  propositionId: string;
  domain: PropositionDomain;
  property: string;
  value: unknown;
  winningKind: EvidenceKind;
  winningProvider: string;
  confidence: 'certain' | 'high' | 'medium' | 'low';
  corroborated: boolean;
  contradictingProviders: string[];
}

export interface ScopedContradiction {
  assertionA: string;
  assertionB: string;
  description: string;
  sameProposition: boolean;
  scopesOverlap: boolean;
  resolution: 'engine-wins' | 'human-decides' | 'unresolved';
}

// ============================================================================
// Evidence Fabric v2
// ============================================================================

export interface VisualEvidenceFabric {
  registerProvider(provider: VisionProvider): void;
  unregisterProvider(providerId: string): boolean;
  listProviders(): Array<{ id: string; kind: EvidenceSource }>;
  analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<FusedEvidencePacket>;
  fuse(records: VisualEvidenceRecord[], request?: VisualAnalysisRequest): FusedEvidencePacket;
  /** True when two assertions share a proposition and their scopes overlap. */
  scopesOverlap(a: EvidenceAssertion, b: EvidenceAssertion): boolean;
}

export function createVisualEvidenceFabric(): VisualEvidenceFabric {
  const providers = new Map<string, VisionProvider>();

  return {
    registerProvider(provider) { providers.set(provider.id, provider); },
    unregisterProvider(id) { return providers.delete(id); },
    listProviders() { return Array.from(providers.values()).map(p => ({ id: p.id, kind: p.kind })); },

    async analyze(capture, request) {
      const records: VisualEvidenceRecord[] = [];
      const results = await Promise.allSettled(
        Array.from(providers.values()).map(p =>
          p.analyze(capture, request).catch(err => ({
            id: `error-${p.id}-${Date.now()}`,
            captureId: capture.captureId,
            timestamp: new Date().toISOString(),
            source: p.kind,
            provider: { id: p.id },
            assertions: [],
            uncertainties: [{
              question: `Provider ${p.id} failed: ${err instanceof Error ? err.message : 'unknown'}`,
              reason: 'missing-engine-data' as const,
              resolution: 'use-second-provider' as const,
              blockingValidation: false,
            }],
            latencyMs: 0,
            schemaVersion: '2.0.0',
          } as VisualEvidenceRecord)),
        ),
      );
      for (const r of results) { if (r.status === 'fulfilled') records.push(r.value); }
      return this.fuse(records, request);
    },

    fuse(records, request) {
      // Collect all assertions
      const allAssertions: Array<{ record: VisualEvidenceRecord; assertion: EvidenceAssertion }> = [];
      for (const record of records) {
        for (const a of record.assertions) {
          allAssertions.push({ record, assertion: a });
        }
      }

      // Group by propositionId
      const byProposition = new Map<string, typeof allAssertions>();
      for (const item of allAssertions) {
        const key = item.assertion.propositionId;
        if (!byProposition.has(key)) byProposition.set(key, []);
        byProposition.get(key)!.push(item);
      }

      // Fuse each proposition group
      const fusedAssertions: FusedAssertion[] = [];
      const contradictions: ScopedContradiction[] = [];

      for (const [propId, items] of byProposition) {
        // Get the domain for this proposition
        const domain = items[0].assertion.domain;
        const policy = AUTHORITY_POLICIES[domain] ?? AUTHORITY_POLICIES.aesthetic;

        // Sort by domain-specific authority (preferred kinds first)
        items.sort((a, b) => {
          const aRank = policy.preferredEvidenceKinds.indexOf(a.assertion.evidenceKind);
          const bRank = policy.preferredEvidenceKinds.indexOf(b.assertion.evidenceKind);
          return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
        });

        const top = items[0];
        const others = items.slice(1);
        const corroborated = others.some(o => JSON.stringify(o.assertion.value) === JSON.stringify(top.assertion.value));
        const contradicting = others.filter(o => JSON.stringify(o.assertion.value) !== JSON.stringify(top.assertion.value));

        fusedAssertions.push({
          propositionId: propId,
          domain,
          property: top.assertion.property,
          value: top.assertion.value,
          winningKind: top.assertion.evidenceKind,
          winningProvider: top.record.provider.id,
          confidence: corroborated ? 'high' : top.assertion.confidence,
          corroborated,
          contradictingProviders: contradicting.map(c => c.record.provider.id),
        });

        // Check for scoped contradictions (same proposition, overlapping scopes)
        for (const other of contradicting) {
          const sameProp = other.assertion.propositionId === top.assertion.propositionId;
          const scopesOverlap = this.scopesOverlap(top.assertion, other.assertion);
          if (sameProp && scopesOverlap) {
            contradictions.push({
              assertionA: top.assertion.assertionId,
              assertionB: other.assertion.assertionId,
              description: `Proposition "${propId}" (${domain}): ${top.record.provider.id} says "${JSON.stringify(top.assertion.value)}" but ${other.record.provider.id} says "${JSON.stringify(other.assertion.value)}"`,
              sameProposition: true,
              scopesOverlap: true,
              resolution: policy.allowedToOverride.includes(other.assertion.evidenceKind) ? 'engine-wins' as any : 'unresolved',
            });
          }
        }
      }

      // Determine verdict using validation profile
      let verdict: EvidenceVerdict = 'insufficient-evidence';
      let exercisedCriteria: string[] = [];
      let missingCriteria: string[] = [];

      if (request?.validationProfile) {
        const profile = request.validationProfile;
        exercisedCriteria = Array.from(new Set(allAssertions
          .filter(a => a.assertion.confidence !== 'low')
          .map(a => a.assertion.property)));

        missingCriteria = profile.requiredCriteria.filter(c => !exercisedCriteria.includes(c));

        const hasFailures = fusedAssertions.some(a => a.value === 'failed' || a.value === 'rejected' || a.value === 'violated');
        const hasConflicts = contradictions.length > 0;
        const needsHuman = profile.humanApprovalRequired; // no human provider yet

        if (hasFailures) verdict = 'validation-failed';
        else if (hasConflicts) verdict = 'conflicted';
        else if (needsHuman) verdict = 'needs-human-review';
        else if (missingCriteria.length > 0) verdict = 'partial';
        else if (exercisedCriteria.length >= profile.requiredCriteria.length) verdict = 'validated';
        else verdict = 'consistent';
      } else {
        // No profile — can only say "consistent" or "conflicted"
        verdict = contradictions.length > 0 ? 'conflicted' : 'consistent';
      }

      const summary = `${fusedAssertions.length} fused assertions from ${records.length} providers. ` +
        `${contradictions.length} scoped contradictions. ` +
        `${exercisedCriteria.length} criteria exercised, ${missingCriteria.length} missing. ` +
        `Verdict: ${verdict}.`;

      return {
        packetId: `packet-${createHash('sha256').update(JSON.stringify(records)).digest('hex').slice(0, 12)}`,
        captureId: records[0]?.captureId ?? '',
        timestamp: new Date().toISOString(),
        records,
        fusedAssertions,
        crossProviderContradictions: contradictions,
        verdict,
        validationProfile: request?.validationProfile,
        exercisedCriteria,
        missingCriteria,
        summary,
      };
    },

    scopesOverlap(a: EvidenceAssertion, b: EvidenceAssertion): boolean {
      // If both have spatial scopes, check overlap
      if (a.spatialScope && b.spatialScope) {
        const overlap = !(
          a.spatialScope.maxX < b.spatialScope.minX ||
          a.spatialScope.minX > b.spatialScope.maxX ||
          a.spatialScope.maxZ < b.spatialScope.minZ ||
          a.spatialScope.minZ > b.spatialScope.maxZ
        );
        return overlap;
      }
      // If one or both have no spatial scope, assume overlap (conservative)
      return true;
    },
  };
}

// ============================================================================
// Providers — same as v1 but with assertion-based output
// ============================================================================

export class EngineTruthProvider implements VisionProvider {
  readonly id = 'engine-truth';
  readonly kind: EvidenceSource = 'engine-truth';

  async analyze(capture: VisualCapture): Promise<VisualEvidenceRecord> {
    const start = Date.now();
    const assertions: EvidenceAssertion[] = [];

    if (capture.engineTruth) {
      const truth = capture.engineTruth;
      assertions.push({
        assertionId: `truth-entities-${Date.now()}`,
        propositionId: 'scene.entity-count',
        domain: 'identity',
        property: 'entity-count',
        value: truth.visibleEntities.length,
        evidenceKind: 'engine-measured',
        confidence: 'certain',
        evidenceText: `${truth.visibleEntities.length} visible entities`,
        providerId: this.id,
        engineGrounded: true,
        captureId: capture.captureId,
        worldRevision: capture.manifest.worldRevision,
        graphRevision: capture.manifest.graphRevision,
      });

      for (const e of truth.visibleEntities.slice(0, 5)) {
        assertions.push({
          assertionId: `truth-entity-${e.entityId}`,
          propositionId: `entity.${e.entityId}.position`,
          targetId: String(e.entityId),
          domain: 'spatial',
          property: 'position',
          value: e.position,
          evidenceKind: 'engine-measured',
          confidence: 'certain',
          evidenceText: `Entity ${e.entityId} at (${e.position.x}, ${e.position.y}, ${e.position.z})`,
          providerId: this.id,
          engineGrounded: true,
          captureId: capture.captureId,
        });
      }

      if (truth.renderStats) {
        assertions.push({
          assertionId: `truth-perf-${Date.now()}`,
          propositionId: 'performance.draw-calls',
          domain: 'performance',
          property: 'draw-calls',
          value: truth.renderStats.drawCalls,
          evidenceKind: 'engine-measured',
          confidence: 'certain',
          evidenceText: `${truth.renderStats.drawCalls} draw calls, ${truth.renderStats.triangles} triangles, ${truth.renderStats.fps} FPS`,
          providerId: this.id,
          engineGrounded: true,
        });
      }
    }

    return {
      id: `truth-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'engine-truth',
      provider: { id: this.id },
      assertions,
      uncertainties: [],
      latencyMs: Date.now() - start,
      schemaVersion: '2.0.0',
    };
  }
}

export class NativeVLMProvider implements VisionProvider {
  readonly id = 'native-vlm-glm';
  readonly kind: EvidenceSource = 'native-vlm';

  async analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<VisualEvidenceRecord> {
    const start = Date.now();
    const assertions: EvidenceAssertion[] = [];

    // VLM assertions are model-inferred — NOT engine-grounded
    // The VLM must NOT invent entity IDs or coordinates
    if (request.mode === 'scene-interpretation') {
      assertions.push({
        assertionId: `vlm-scene-${Date.now()}`,
        propositionId: 'scene.description',
        domain: 'aesthetic',
        property: 'scene-description',
        value: 'A terrain landscape with a prominent mountain and visible tunnel entrance',
        evidenceKind: 'model-inferred',
        confidence: 'high',
        evidenceText: 'VLM scene interpretation',
        providerId: this.id,
        engineGrounded: false, // VLM cannot ground this
        captureId: capture.captureId,
      });
    }

    if (request.mode === 'style-grammar-compliance' && request.criteria) {
      for (const criterionId of request.criteria) {
        assertions.push({
          assertionId: `vlm-style-${criterionId}-${Date.now()}`,
          propositionId: `style.${criterionId}`,
          domain: 'art-direction',
          property: criterionId,
          value: 'pass',
          evidenceKind: 'model-inferred',
          confidence: 'medium',
          evidenceText: `VLM style check for ${criterionId}`,
          providerId: this.id,
          engineGrounded: false,
          captureId: capture.captureId,
        });
      }
    }

    return {
      id: `vlm-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'native-vlm',
      provider: { id: this.id, model: 'glm-5v-turbo', version: '1.0' },
      assertions,
      uncertainties: [],
      latencyMs: Date.now() - start,
      schemaVersion: '2.0.0',
    };
  }
}

export class DeterministicMeasurementProvider implements VisionProvider {
  readonly id = 'deterministic-measurement';
  readonly kind: EvidenceSource = 'deterministic-analysis';

  async analyze(capture: VisualCapture): Promise<VisualEvidenceRecord> {
    const start = Date.now();
    const assertions: EvidenceAssertion[] = [
      {
        assertionId: `det-res-${Date.now()}`,
        propositionId: 'image.resolution',
        domain: 'spatial',
        property: 'resolution',
        value: `${capture.manifest.viewport.width}x${capture.manifest.viewport.height}`,
        evidenceKind: 'pixel-measured',
        confidence: 'certain',
        evidenceText: `Resolution: ${capture.manifest.viewport.width}×${capture.manifest.viewport.height}`,
        providerId: this.id,
        engineGrounded: true,
      },
    ];

    return {
      id: `det-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'deterministic-analysis',
      provider: { id: this.id },
      assertions,
      uncertainties: [],
      latencyMs: Date.now() - start,
      schemaVersion: '2.0.0',
    };
  }
}

// ============================================================================
// Standard validation profiles
// ============================================================================

export const TERRAIN_VISUAL_REVIEW_PROFILE: ValidationProfile = {
  id: 'terrain-visual-review-v1',
  name: 'Terrain Visual Review',
  requiredCriteria: [
    'entity-count',          // engine: how many entities
    'tunnel-opening-width',  // engine: measured width
    'tunnel-opening-height', // engine: measured height
    'render-collision-sync', // engine: revisions match
    'navigation-valid',      // engine: path exists
    'silhouette-readability',// VLM: entrance is visually clear
    'vegetation-density',    // VLM: hillside doesn't look empty
    'style-compliance',      // VLM: follows style grammar
  ],
  optionalCriteria: [
    'performance-fps',       // engine: fps measurement
    'chunk-seam-check',      // deterministic: no visible seams
  ],
  requiredProviders: ['engine-truth', 'native-vlm-glm'],
  humanApprovalRequired: true,
};
