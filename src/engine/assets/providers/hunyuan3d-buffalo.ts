/**
 * Hunyuan3D-Buffalo Provider — Mocked Implementation
 * ==================================================
 *
 * STATUS: Research candidate. No public inference implementation exists.
 *
 * The paper "Hunyuan3D-Buffalo" (arXiv:2608.02711, submitted Aug 3 2026)
 * describes a unified 3D understanding + generation + editing + part
 * extraction system. However:
 *   - No public model checkpoints are available
 *   - No inference code is published
 *   - No deployment metrics (VRAM, latency, GPU requirements) are reported
 *   - The official GitHub repo contains only the static project website
 *
 * This provider is a MOCK that returns placeholder results. It exists to:
 *   1. Validate the Unified3DProvider interface
 *   2. Let the Asset Forge and operation graph be built against a real
 *      provider shape
 *   3. Provide a test bed for the candidate/preview/accept workflow
 *
 * When a real inference implementation becomes available, swap this mock
 * for a real adapter — the interface stays the same.
 */

import { deterministicId } from '../../../lib/determinism/primitives';
import type {
  Unified3DProvider,
  ProviderCapability,
  AssetUnderstandingRequest,
  AssetUnderstandingResult,
  AssetGenerationRequest,
  GeneratedAssetCandidate,
  AssetEditingRequest,
  EditedAssetCandidate,
  PartExtractionRequest,
  SemanticPartCandidate,
} from '../unified-provider';
import type {
  SemanticAsset,
  CandidateAsset,
  SemanticPart,
  Bounds3,
} from '../semantic-asset';

const PROVIDER_ID = 'hunyuan3d-buffalo';
const MODEL_VERSION = 'buffalo-v1-mock-2026-08-05';

export class Hunyuan3DBuffaloProvider implements Unified3DProvider {
  readonly providerId = PROVIDER_ID;
  readonly modelVersion = MODEL_VERSION;
  readonly displayName = 'Hunyuan3D-Buffalo (Mock)';
  readonly available = false; // No public inference yet

  readonly capabilities: ProviderCapability[] = [
    {
      capability: 'understand',
      implemented: false,
      requiresRemoteGPU: true,
      hardwareRequirements: 'Unknown — paper does not disclose VRAM/GPU requirements',
    },
    {
      capability: 'generate',
      implemented: false,
      requiresRemoteGPU: true,
      hardwareRequirements: 'Unknown — paper does not disclose VRAM/GPU requirements',
    },
    {
      capability: 'edit',
      implemented: false,
      requiresRemoteGPU: true,
      hardwareRequirements: 'Unknown — paper does not disclose VRAM/GPU requirements',
    },
    {
      capability: 'extract-parts',
      implemented: false,
      requiresRemoteGPU: true,
      hardwareRequirements: 'Unknown — paper does not disclose VRAM/GPU requirements',
    },
  ];

  async understand(request: AssetUnderstandingRequest): Promise<AssetUnderstandingResult> {
    return this.mockResult('understand', () => ({
      answer: `[MOCK] Hunyuan3D-Buffalo is not available for inference. Query was: "${request.query}". Asset: ${request.asset.assetId} rev ${request.asset.revision}.`,
      referencedParts: [],
      confidence: 0,
    }));
  }

  async generate(request: AssetGenerationRequest): Promise<GeneratedAssetCandidate> {
    return this.mockResult('generate', () => ({
      candidate: createMockCandidate(request.prompt, 'ai-generated'),
      description: `[MOCK] Would generate a 3D asset for: "${request.prompt}". No public model available.`,
      warnings: [
        'Hunyuan3D-Buffalo has no public inference implementation',
        'No VRAM/latency/GPU requirements disclosed in the paper',
        'This is a placeholder candidate for interface validation only',
      ],
    }));
  }

  async edit(request: AssetEditingRequest): Promise<EditedAssetCandidate> {
    return this.mockResult('edit', () => ({
      candidate: createMockCandidate(
        `Edit: ${request.instruction}`,
        'ai-edited',
        request.sourceAsset,
      ),
      observedChange: `[MOCK] Would edit asset ${request.sourceAsset.assetId} per: "${request.instruction}". Target parts: ${request.targetPartIds.join(', ')}. Protected: ${request.protectedPartIds.join(', ')}.`,
      unexpectedDifferences: [],
      success: false,
    }));
  }

  async extractParts(request: PartExtractionRequest): Promise<SemanticPartCandidate[]> {
    return this.mockResult('extract-parts', () => {
      // Return mock parts based on common sword anatomy
      const mockParts: SemanticPartCandidate[] = [
        createMockPartCandidate('blade', 'weapon.blade', request.asset.geometry.bounds),
        createMockPartCandidate('guard', 'weapon.hilt.guard', request.asset.geometry.bounds),
        createMockPartCandidate('grip', 'weapon.hilt.grip', request.asset.geometry.bounds),
        createMockPartCandidate('pommel', 'weapon.hilt.pommel', request.asset.geometry.bounds),
      ];
      return mockParts.slice(0, request.maxParts ?? mockParts.length);
    });
  }

  private async mockResult<T>(capability: string, fn: () => T): Promise<T> {
    // Simulate network/inference delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.warn(
      `[Hunyuan3DBuffaloProvider] MOCK: ${capability} called but no public inference exists. ` +
      `Returning placeholder. Provider: ${PROVIDER_ID} v${MODEL_VERSION}`,
    );
    return fn();
  }
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

let candSeq = 0;

function createMockCandidate(
  instruction: string,
  source: 'ai-generated' | 'ai-edited',
  sourceAsset?: SemanticAsset,
): CandidateAsset {
  const now = new Date().toISOString();
  const assetId = sourceAsset ? sourceAsset.assetId : `asset-${Date.now().toString(36)}`;
  const revision = sourceAsset ? sourceAsset.revision + 1 : 1;

  return {
    candidateId: deterministicId('candidate', 'hunyuan3d', [Date.now(), candSeq++]),
    asset: {
      assetId,
      revision,
      geometry: sourceAsset?.geometry ?? createMockGeometry(),
      materials: sourceAsset?.materials ?? [],
      semanticParts: sourceAsset?.semanticParts ?? { parts: [], relationships: [] },
      attachmentPoints: sourceAsset?.attachmentPoints ?? [],
      editableRegions: sourceAsset?.editableRegions ?? [],
      dimensions: sourceAsset?.dimensions ?? {
        widthMeters: 0.1,
        heightMeters: 1.0,
        depthMeters: 0.1,
        importScale: [1, 1, 1],
        pivotOffset: [0, 0, 0],
      },
      canonicalViews: sourceAsset?.canonicalViews ?? [],
      provenance: {
        source,
        providerId: PROVIDER_ID,
        providerModelVersion: MODEL_VERSION,
        instruction,
        sourceAssetRevision: sourceAsset?.revision,
        createdAt: now,
      },
      validation: {
        validated: false,
        checks: [],
        defects: [
          {
            defectId: 'mock-placeholder',
            severity: 'warning',
            category: 'provenance',
            description: 'This is a mock candidate from a provider with no public inference. Do not commit to authoritative state.',
          },
        ],
      },
    },
    status: 'pending',
    createdAt: now,
  };
}

function createMockGeometry() {
  // Minimal placeholder geometry — a small box
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
    0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
  ]);
  const indices = new Uint32Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
  ]);
  return {
    hash: 'mock-' + Date.now().toString(36),
    positions,
    indices,
    vertexCount: 8,
    triangleCount: 4,
    bounds: { min: [0, 0, 0], max: [1, 1, 1] } as Bounds3,
  };
}

function createMockPartCandidate(
  name: string,
  category: string,
  assetBounds: Bounds3,
): SemanticPartCandidate {
  const part: SemanticPart = {
    partId: `part-${name}`,
    name,
    category,
    triangleIndices: new Uint32Array(0),
    bounds: assetBounds,
    editable: true,
    extractable: true,
  };
  return {
    part,
    confidence: 0,
    alternativeNames: [],
  };
}
