/**
 * Asset Pipeline — the ONE end-to-end path for assets
 * =====================================================
 *
 * source (deterministic generator)
 *   → validate (acceptance gate)
 *   → register (canonical AssetRegistry revision)
 *   → derive   (LOD chain via meshoptimizer, collision AABB hierarchy)
 *   → export   (multi-mesh GLB via @gltf-transform)
 *   → round-trip validate (io.readBinary on the produced GLB)
 *   → instantiate (EntityInstances sharing one revision)
 *
 * Failure contract: if the acceptance gate fails, nothing is registered,
 * nothing is derived, nothing is instantiated. The pipeline returns
 * ok:false with the gate's defects.
 *
 * Determinism contract: seed → asset → validation → hashes are all
 * deterministic. createdAt timestamps are metadata only and never enter
 * content hashes.
 */

import type { SemanticAsset } from './semantic-asset';
import type { AcceptanceGateConfig } from './acceptance-gate';
import { DEFAULT_GATE_CONFIG, validateSemanticAsset } from './acceptance-gate';
import { generatePagodaSource, PAGODA_GENERATOR_ID } from './procedural-pagoda';
import { buildPagodaSemanticAsset } from './semantic-builder';
import { deriveLODChain, deriveCollisionHierarchy, type LODChainResult, type CollisionHierarchyResult } from './artifact-derivation';
import { exportSemanticToGLB, readbackGLB, type GLBArtifact, type GLBReadbackSummary } from './glb-pipeline';
import { AssetRegistry, type EntityInstance } from '../studio/asset-registry';

export interface AssetPipelineRequest {
  /** Deterministic seed for the source generator. */
  seed: number;
  /** Asset name (defaults to ga:pagoda). */
  name?: string;
  /** LOD ratios. */
  lodRatios?: number[];
  /** Semantic parts exempt from LOD reduction. */
  protectedParts?: string[];
  /** How many EntityInstances to create (proof of revision sharing). */
  instantiate?: number;
  /** Acceptance gate overrides. */
  gateConfig?: Partial<AcceptanceGateConfig>;
  /** Source instruction recorded in provenance. */
  instruction?: string;
}

export interface AssetPipelineResult {
  ok: boolean;
  assetId: string;
  seed: number;
  validation: { passed: boolean; summary: string; checks: unknown[]; defects: unknown[] };
  /** Present only when ok (registered revision). */
  revision?: {
    revision: number;
    contentHash: string;
    semanticHash: string;
    triangleCount: number;
    materialCount: number;
  };
  glb?: GLBArtifact;
  roundTrip?: GLBReadbackSummary;
  lodChain?: LODChainResult;
  collision?: CollisionHierarchyResult;
  instances?: EntityInstance[];
  registrySummary?: ReturnType<AssetRegistry['getSummary']>;
  error?: string;
}

export class AssetPipeline {
  constructor(private registry: AssetRegistry) {}

  /**
   * Run the full pipeline end-to-end.
   */
  async run(request: AssetPipelineRequest): Promise<AssetPipelineResult> {
    const seed = request.seed;
    const name = request.name ?? 'ga:pagoda';
    const assetId = name;
    const instruction =
      request.instruction ??
      `Deterministic stylized xianxia pagoda (seed ${seed}) — Zhao-country timber-frame architecture, stone base, swept roof, golden spire.`;

    // 1. SOURCE — deterministic multi-mesh generation.
    const source = generatePagodaSource(seed);

    // 2. SEMANTIC — wrap in the engine-owned representation.
    const asset: SemanticAsset = buildPagodaSemanticAsset(source, {
      assetId,
      seed,
      instruction,
    });

    // 3. VALIDATE — the acceptance gate. Nothing proceeds on failure.
    const gateConfig: AcceptanceGateConfig = {
      ...DEFAULT_GATE_CONFIG,
      requireNormals: true,
      minUVCoverage: 0.9,
      ...request.gateConfig,
    };
    const gate = validateSemanticAsset(asset, gateConfig);

    if (!gate.passed) {
      return {
        ok: false,
        assetId,
        seed,
        validation: {
          passed: false,
          summary: gate.summary,
          checks: gate.checks,
          defects: gate.defects,
        },
      };
    }

    try {
      // 4. EXPORT — multi-mesh GLB (needed for the revision content hash).
      const glb = await exportSemanticToGLB(asset);

      // 5. REGISTER — one canonical revision, content-addressed.
      const revision = this.registry.registerRevision({
        assetId,
        glbBytes: glb.buffer,
        semanticHash: asset.geometry.hash,
        vertexCount: asset.geometry.vertexCount,
        faceCount: asset.geometry.triangleCount,
        triangleCount: asset.geometry.triangleCount,
        materialCount: asset.materials.length,
        source: 'procedural-pipeline',
      });

      // 6. ROUND-TRIP — read the produced GLB back and verify structure.
      const roundTrip = await readbackGLB(glb.buffer, asset.geometry, asset.semanticParts.parts.length);

      // 7. DERIVE — LOD chain (meshoptimizer) + collision hierarchy.
      const protectedParts = request.protectedParts ?? ['spire'];
      const lodChain = await deriveLODChain(asset, request.lodRatios ?? [0.5, 0.25], protectedParts);
      const collision = deriveCollisionHierarchy(asset.geometry);

      this.registry.attachDerivedArtifact(assetId, revision.revision, {
        artifactId: `${assetId}.rev${revision.revision}.lod`,
        kind: 'lod-chain',
        sourceRevision: revision.revision,
        hash: lodChain.levels.length > 0 ? lodChain.levels[lodChain.levels.length - 1]!.parts.map((p) => p.hash).join(',') : lodChain.sourceHash,
        summary: {
          levels: lodChain.levels.map((l) => ({ level: l.level, ratio: l.ratio, totalAfter: l.totalAfter })),
          protectedParts,
        },
      });
      this.registry.attachDerivedArtifact(assetId, revision.revision, {
        artifactId: `${assetId}.rev${revision.revision}.collision`,
        kind: 'collision-hierarchy',
        sourceRevision: revision.revision,
        hash: collision.hash,
        summary: { boxes: collision.boxes.length, triangleCount: collision.triangleCount },
      });
      this.registry.attachDerivedArtifact(assetId, revision.revision, {
        artifactId: `${assetId}.rev${revision.revision}.glb`,
        kind: 'glb',
        sourceRevision: revision.revision,
        hash: glb.hash,
        summary: { sizeBytes: glb.sizeBytes, meshCount: glb.meshCount, triangleCount: glb.triangleCount },
      });

      // 8. INSTANTIATE — N entities sharing ONE revision.
      const instances: EntityInstance[] = [];
      const count = request.instantiate ?? 0;
      for (let i = 0; i < count; i++) {
        instances.push(
          this.registry.createEntityInstance(
            assetId,
            revision.revision,
            [i * 6 - 6, 0, 0],
            'village-square',
            [`pagoda.${i}`, 'structure'],
          ),
        );
      }

      return {
        ok: true,
        assetId,
        seed,
        validation: {
          passed: true,
          summary: gate.summary,
          checks: gate.checks,
          defects: gate.defects,
        },
        revision: {
          revision: revision.revision,
          contentHash: revision.contentHash,
          semanticHash: revision.semanticHash,
          triangleCount: revision.triangleCount,
          materialCount: revision.materialCount,
        },
        glb,
        roundTrip,
        lodChain,
        collision,
        instances,
        registrySummary: this.registry.getSummary(),
      };
    } catch (err) {
      return {
        ok: false,
        assetId,
        seed,
        validation: {
          passed: true,
          summary: gate.summary,
          checks: gate.checks,
          defects: gate.defects,
        },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const PIPELINE_GENERATOR_ID = PAGODA_GENERATOR_ID;
