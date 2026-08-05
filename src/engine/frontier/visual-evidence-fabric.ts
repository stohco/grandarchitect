/**
 * Visual Evidence Fabric — provider-neutral multimodal observation system
 *
 * Combines several evidence sources rather than declaring one model
 * "the vision system." The Grand Architect receives a fused evidence packet.
 *
 * Evidence sources:
 *   1. Engine Truth Provider — object IDs, depth, coordinates, bounds,
 *      collision, navigation, provenance (deterministic, authoritative)
 *   2. Native VLM Provider — interpretation, aesthetics, relationships,
 *      design critique, intent reasoning (model-inferred)
 *   3. Structured Evidence Provider — OCR, regions, reading order, entities,
 *      relations, uncertainty (e.g. ModLens-style adapter)
 *   4. Deterministic Measurement Provider — dimensions, proportions, timing,
 *      pixel differences, silhouettes (engine-measured)
 *   5. Optional Independent Critic — second-model disagreement and review
 *
 * The system must NEVER treat all five as equivalent facts.
 * Engine truth overrides model inference for identity, coordinates, scale.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import { createHash } from 'crypto';

// ============================================================================
// Epistemic classification — what kind of evidence is this?
// ============================================================================

export type EvidenceKind =
  | 'engine-measured'    // from deterministic engine telemetry (authoritative for identity/scale/timing)
  | 'pixel-measured'     // from deterministic pixel analysis (authoritative for visual diff)
  | 'text-extracted'     // from OCR / structured text extraction
  | 'model-inferred'     // from a VLM or LLM interpretation (NOT authoritative)
  | 'human-confirmed';   // from user review (authoritative for art direction)

// ============================================================================
// Visual Evidence Record
// ============================================================================

export interface VisualEvidenceRecord {
  id: string;
  captureId: string;
  timestamp: string;

  source: EvidenceSource;
  provider: {
    id: string;
    model?: string;
    version?: string;
  };

  observations: VisualObservation[];
  uncertainties: VisualUncertainty[];
  contradictions: EvidenceContradiction[];

  imageRevision: string;
  worldRevision?: number;
  graphRevision?: number;

  latencyMs: number;
  cost?: number;
  schemaVersion: string;
}

export type EvidenceSource =
  | 'engine-truth'
  | 'native-vlm'
  | 'structured-vision'
  | 'deterministic-analysis'
  | 'human';

// ============================================================================
// Observation — a single piece of visual evidence
// ============================================================================

export interface VisualObservation {
  observationId: string;
  kind: EvidenceKind;
  criterionId?: string;          // links to a style grammar rule or VTP check
  field: string;                 // e.g. 'height', 'silhouette', 'material', 'ocr-text'
  value: string;                 // the observed value
  confidence: 'high' | 'medium' | 'low' | 'certain';
  evidenceText: string;          // human-readable explanation
  // Engine-grounded reference (for engine-measured observations)
  entityId?: number;
  worldPosition?: { x: number; y: number; z: number };
  // Pixel region (for pixel-measured observations — NOT model-generated)
  pixelRegion?: { x: number; y: number; width: number; height: number };
}

export interface VisualUncertainty {
  question: string;
  requiredEvidence: string;      // what additional evidence would resolve this
  blockingValidation: boolean;   // does this block the validation gate?
}

export interface EvidenceContradiction {
  observationA: string;          // observation ID
  observationB: string;          // observation ID
  description: string;
  resolution?: 'engine-wins' | 'human-decides' | 'unresolved';
}

// ============================================================================
// Vision Provider interface — all providers implement this
// ============================================================================

export interface VisionProvider {
  readonly id: string;
  readonly kind: EvidenceSource;
  analyze(
    capture: VisualCapture,
    request: VisualAnalysisRequest,
  ): Promise<VisualEvidenceRecord>;
}

export interface VisualCapture {
  captureId: string;
  imageData?: Buffer;           // raw image bytes (for API providers)
  imageBase64?: string;         // base64-encoded image
  imageUrl?: string;            // URL to image
  // Engine ground truth (available alongside the image)
  engineTruth?: EngineTruthCapture;
  metadata: {
    width: number;
    height: number;
    source: 'editor-viewport' | 'oracle-capture' | 'reference-image' | 'screenshot' | 'uploaded';
    cameraPosition?: [number, number, number];
    cameraTarget?: [number, number, number];
    renderMode?: string;
  };
}

export interface EngineTruthCapture {
  // Exact engine data — NOT model-inferred
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
  criteria?: string[];           // criterion IDs to check (e.g. style grammar rules)
  prompt?: string;               // additional context
  requireStructuredOutput: boolean;
}

export type AnalysisMode =
  | 'scene-interpretation'
  | 'visual-fidelity-review'
  | 'ocr-text-extraction'
  | 'layout-analysis'
  | 'asset-comparison'
  | 'style-grammar-compliance'
  | 'scale-and-proportion-review'
  | 'animation-review'
  | 'ui-review'
  | 'ambiguous-target-resolution';

// ============================================================================
// Fused Evidence Packet — what the Grand Architect receives
// ============================================================================

export interface FusedEvidencePacket {
  packetId: string;
  captureId: string;
  timestamp: string;
  records: VisualEvidenceRecord[];

  // Fused observations sorted by epistemic authority
  // engine-measured > pixel-measured > human-confirmed > text-extracted > model-inferred
  fusedObservations: FusedObservation[];

  // Contradictions between providers
  crossProviderContradictions: EvidenceContradiction[];

  // Overall verdict
  verdict: 'accepted' | 'warning' | 'rejected' | 'inconclusive';
  summary: string;
}

export interface FusedObservation {
  field: string;
  value: string;
  kind: EvidenceKind;
  confidence: 'certain' | 'high' | 'medium' | 'low';
  sourceProvider: string;
  corroborated: boolean;         // multiple providers agree
  contradictingProviders: string[];
}

// ============================================================================
// Evidence Fabric — the orchestrator
// ============================================================================

export interface VisualEvidenceFabric {
  registerProvider(provider: VisionProvider): void;
  unregisterProvider(providerId: string): boolean;
  listProviders(): Array<{ id: string; kind: EvidenceSource }>;

  analyze(
    capture: VisualCapture,
    request: VisualAnalysisRequest,
  ): Promise<FusedEvidencePacket>;

  // Fuse multiple provider records into one packet
  fuse(records: VisualEvidenceRecord[]): FusedEvidencePacket;
}

export function createVisualEvidenceFabric(): VisualEvidenceFabric {
  const providers = new Map<string, VisionProvider>();

  return {
    registerProvider(provider) {
      providers.set(provider.id, provider);
    },

    unregisterProvider(providerId) {
      return providers.delete(providerId);
    },

    listProviders() {
      return Array.from(providers.values()).map(p => ({ id: p.id, kind: p.kind }));
    },

    async analyze(capture, request) {
      const records: VisualEvidenceRecord[] = [];

      // Run all registered providers in parallel
      const results = await Promise.allSettled(
        Array.from(providers.values()).map(p =>
          p.analyze(capture, request).catch(err => {
            return {
              id: `error-${p.id}-${Date.now()}`,
              captureId: capture.captureId,
              timestamp: new Date().toISOString(),
              source: p.kind,
              provider: { id: p.id },
              observations: [],
              uncertainties: [{
                question: `Provider ${p.id} failed: ${err instanceof Error ? err.message : 'unknown'}`,
                requiredEvidence: 'Provider error — retry or use alternative provider',
                blockingValidation: false,
              }],
              contradictions: [],
              imageRevision: '',
              latencyMs: 0,
              schemaVersion: '1.0.0',
            } as VisualEvidenceRecord;
          }),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          records.push(result.value);
        }
      }

      return this.fuse(records);
    },

    fuse(records) {
      // Collect all observations
      const allObservations: Array<{ record: VisualEvidenceRecord; obs: VisualObservation }> = [];
      for (const record of records) {
        for (const obs of record.observations) {
          allObservations.push({ record, obs });
        }
      }

      // Group by field
      const byField = new Map<string, typeof allObservations>();
      for (const item of allObservations) {
        const key = item.obs.field;
        if (!byField.has(key)) byField.set(key, []);
        byField.get(key)!.push(item);
      }

      // Fuse: for each field, pick the highest-authority observation
      const authorityOrder: Record<EvidenceKind, number> = {
        'engine-measured': 5,
        'pixel-measured': 4,
        'human-confirmed': 3,
        'text-extracted': 2,
        'model-inferred': 1,
      };

      const fusedObservations: FusedObservation[] = [];
      const crossProviderContradictions: EvidenceContradiction[] = [];

      for (const [field, items] of byField) {
        // Sort by authority (highest first)
        items.sort((a, b) => (authorityOrder[b.obs.kind] ?? 0) - (authorityOrder[a.obs.kind] ?? 0));

        const top = items[0];
        const others = items.slice(1);

        // Check for corroboration
        const corroborated = others.some(o => o.obs.value === top.obs.value);
        const contradictingProviders = others
          .filter(o => o.obs.value !== top.obs.value)
          .map(o => o.record.provider.id);

        fusedObservations.push({
          field,
          value: top.obs.value,
          kind: top.obs.kind,
          confidence: corroborated ? 'high' : top.obs.confidence,
          sourceProvider: top.record.provider.id,
          corroborated,
          contradictingProviders,
        });

        // Record contradictions
        if (contradictingProviders.length > 0) {
          for (const other of others.filter(o => o.obs.value !== top.obs.value)) {
            crossProviderContradictions.push({
              observationA: top.obs.observationId,
              observationB: other.obs.observationId,
              description: `Field "${field}": ${top.record.provider.id} says "${top.obs.value}" but ${other.record.provider.id} says "${other.obs.value}"`,
              resolution: top.obs.kind === 'engine-measured' ? 'engine-wins' : 'unresolved',
            });
          }
        }
      }

      // Determine overall verdict
      const hasRejections = records.some(r =>
        r.observations.some(o => o.confidence === 'certain' && o.value === 'rejected'),
      );
      const hasWarnings = records.some(r =>
        r.observations.some(o => o.confidence === 'high' && o.value === 'warning'),
      );
      const hasBlockingUncertainties = records.some(r =>
        r.uncertainties.some(u => u.blockingValidation),
      );

      const verdict: FusedEvidencePacket['verdict'] =
        hasRejections ? 'rejected'
        : hasWarnings ? 'warning'
        : hasBlockingUncertainties ? 'inconclusive'
        : 'accepted';

      const summary = `${fusedObservations.length} fused observations from ${records.length} providers. ` +
        `${crossProviderContradictions.length} cross-provider contradictions. ` +
        `Verdict: ${verdict}.`;

      return {
        packetId: `packet-${createHash('sha256').update(JSON.stringify(records)).digest('hex').slice(0, 12)}`,
        captureId: records[0]?.captureId ?? '',
        timestamp: new Date().toISOString(),
        records,
        fusedObservations,
        crossProviderContradictions,
        verdict,
        summary,
      };
    },
  };
}

// ============================================================================
// Native VLM Provider — wraps our existing z-ai vision with structured output
// ============================================================================

export class NativeVLMProvider implements VisionProvider {
  readonly id = 'native-vlm-glm';
  readonly kind: EvidenceSource = 'native-vlm';

  async analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<VisualEvidenceRecord> {
    const startTime = Date.now();

    // Build a structured prompt based on the analysis mode
    const structuredPrompt = this.buildStructuredPrompt(request);

    // In production, this would call z-ai-web-dev-sdk's createVision API
    // For now, we return a structured record that demonstrates the contract
    const observations: VisualObservation[] = [];

    if (request.mode === 'style-grammar-compliance' && request.criteria) {
      for (const criterionId of request.criteria) {
        observations.push({
          observationId: `obs-${criterionId}-${Date.now().toString(36)}`,
          kind: 'model-inferred',
          criterionId,
          field: `style-compliance.${criterionId}`,
          value: 'pass', // would be determined by actual VLM analysis
          confidence: 'medium',
          evidenceText: `VLM analysis of criterion ${criterionId} (placeholder — actual VLM call needed)`,
        });
      }
    }

    if (request.mode === 'scene-interpretation') {
      observations.push({
        observationId: `obs-scene-${Date.now().toString(36)}`,
        kind: 'model-inferred',
        field: 'scene.description',
        value: 'A terrain landscape with a mountain and tunnel visible',
        confidence: 'high',
        evidenceText: 'VLM scene interpretation (placeholder)',
      });
    }

    return {
      id: `vlm-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'native-vlm',
      provider: { id: this.id, model: 'glm-5v-turbo', version: '1.0' },
      observations,
      uncertainties: [],
      contradictions: [],
      imageRevision: capture.captureId,
      latencyMs: Date.now() - startTime,
      schemaVersion: '1.0.0',
    };
  }

  private buildStructuredPrompt(request: VisualAnalysisRequest): string {
    const modePrompts: Record<AnalysisMode, string> = {
      'scene-interpretation': 'Describe the scene, identifying key objects, their spatial relationships, and overall composition.',
      'visual-fidelity-review': 'Review visual fidelity: check for clipping, texture artifacts, LOD popping, shadow issues, and material correctness.',
      'ocr-text-extraction': 'Extract all visible text, preserving reading order and language.',
      'layout-analysis': 'Analyze the layout: identify regions, their types, and spatial arrangement.',
      'asset-comparison': 'Compare the asset against the reference, noting differences in proportions, materials, and silhouette.',
      'style-grammar-compliance': 'Check compliance with the specified style grammar criteria. For each criterion, return: criterionId, result (pass/warning/violated), evidence, confidence.',
      'scale-and-proportion-review': 'Assess scale and proportion: do objects appear correctly sized relative to each other and the environment?',
      'animation-review': 'Review animation: check for foot sliding, clipping, timing issues, and unnatural motion.',
      'ui-review': 'Review the UI: check for readability, alignment, contrast, and consistency.',
      'ambiguous-target-resolution': 'Identify which object the user likely intends to select, with confidence and alternatives.',
    };

    let prompt = modePrompts[request.mode] ?? 'Analyze the image.';
    if (request.criteria) {
      prompt += `\n\nCriteria to check: ${request.criteria.join(', ')}`;
    }
    if (request.prompt) {
      prompt += `\n\nAdditional context: ${request.prompt}`;
    }
    prompt += '\n\nReturn structured JSON with: observations (array of {field, value, confidence, evidenceText}), uncertainties (array of {question, requiredEvidence, blockingValidation}).';
    return prompt;
  }
}

// ============================================================================
// Engine Truth Provider — deterministic, authoritative
// ============================================================================

export class EngineTruthProvider implements VisionProvider {
  readonly id = 'engine-truth';
  readonly kind: EvidenceSource = 'engine-truth';

  async analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<VisualEvidenceRecord> {
    const startTime = Date.now();
    const observations: VisualObservation[] = [];

    if (capture.engineTruth) {
      const truth = capture.engineTruth;

      // Report entity count (engine-measured, certain)
      observations.push({
        observationId: `truth-entities-${Date.now().toString(36)}`,
        kind: 'engine-measured',
        field: 'scene.entity-count',
        value: String(truth.visibleEntities.length),
        confidence: 'certain',
        evidenceText: `Engine reports ${truth.visibleEntities.length} visible entities`,
      });

      // Report selected entities (engine-measured, certain)
      observations.push({
        observationId: `truth-selected-${Date.now().toString(36)}`,
        kind: 'engine-measured',
        field: 'scene.selected-entities',
        value: JSON.stringify(truth.selectedEntityIds),
        confidence: 'certain',
        evidenceText: `Selected entities: ${truth.selectedEntityIds.join(', ') || 'none'}`,
      });

      // Report render stats
      if (truth.renderStats) {
        observations.push({
          observationId: `truth-render-${Date.now().toString(36)}`,
          kind: 'engine-measured',
          field: 'performance.draw-calls',
          value: String(truth.renderStats.drawCalls),
          confidence: 'certain',
          evidenceText: `Draw calls: ${truth.renderStats.drawCalls}, Triangles: ${truth.renderStats.triangles}, FPS: ${truth.renderStats.fps}`,
        });
      }

      // Report entity positions and bounds
      for (const entity of truth.visibleEntities.slice(0, 10)) {
        observations.push({
          observationId: `truth-entity-${entity.entityId}`,
          kind: 'engine-measured',
          field: `entity.${entity.entityId}.position`,
          value: JSON.stringify(entity.position),
          confidence: 'certain',
          evidenceText: `Entity ${entity.entityId} (${entity.type}) at position (${entity.position.x}, ${entity.position.y}, ${entity.position.z})`,
          entityId: entity.entityId,
          worldPosition: entity.position,
        });
      }
    }

    return {
      id: `truth-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'engine-truth',
      provider: { id: this.id },
      observations,
      uncertainties: [],
      contradictions: [],
      imageRevision: capture.captureId,
      latencyMs: Date.now() - startTime,
      schemaVersion: '1.0.0',
    };
  }
}

// ============================================================================
// Deterministic Measurement Provider — pixel analysis, no model
// ============================================================================

export class DeterministicMeasurementProvider implements VisionProvider {
  readonly id = 'deterministic-measurement';
  readonly kind: EvidenceSource = 'deterministic-analysis';

  async analyze(capture: VisualCapture, request: VisualAnalysisRequest): Promise<VisualEvidenceRecord> {
    const startTime = Date.now();
    const observations: VisualObservation[] = [];

    // Pixel-level measurements (deterministic, no model)
    observations.push({
      observationId: `pixel-resolution-${Date.now().toString(36)}`,
      kind: 'pixel-measured',
      field: 'image.resolution',
      value: `${capture.metadata.width}x${capture.metadata.height}`,
      confidence: 'certain',
      evidenceText: `Image resolution: ${capture.metadata.width}×${capture.metadata.height} pixels`,
    });

    observations.push({
      observationId: `pixel-source-${Date.now().toString(36)}`,
      kind: 'pixel-measured',
      field: 'image.source',
      value: capture.metadata.source,
      confidence: 'certain',
      evidenceText: `Capture source: ${capture.metadata.source}`,
    });

    return {
      id: `det-${capture.captureId}-${Date.now().toString(36)}`,
      captureId: capture.captureId,
      timestamp: new Date().toISOString(),
      source: 'deterministic-analysis',
      provider: { id: this.id },
      observations,
      uncertainties: [],
      contradictions: [],
      imageRevision: capture.captureId,
      latencyMs: Date.now() - startTime,
      schemaVersion: '1.0.0',
    };
  }
}
