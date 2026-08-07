/**
 * Semantic Asset Builder — wraps source geometry in the engine-owned
 * SemanticAsset representation (src/engine/assets/semantic-asset.ts).
 *
 * The pipeline's contract: EVERY source of geometry (procedural generators,
 * AI providers, imports) enters the pipeline as a SemanticAsset carrying
 * provenance, semantic parts, editable regions and validation state — the
 * representation the corpus ground-truth spec (doc 50) demands for
 * "why does this look the way it does?" provenance chains.
 */

import type {
  SemanticAsset,
  GeometryArtifact,
  MaterialArtifact,
  SemanticPart,
  StructuralRelation,
  AttachmentPoint,
  EditableRegion,
  AssetDimensions,
  CaptureReference,
} from './semantic-asset';
import type { PagodaSourceMesh, PagodaPart } from './procedural-pagoda';
import { PAGODA_GENERATOR_ID, PAGODA_GENERATOR_VERSION } from './procedural-pagoda';
import { hashGeometry } from './content-hash';

// ---------------------------------------------------------------------------
// Material palette (per part)
// ---------------------------------------------------------------------------

export interface PartMaterialSpec {
  baseColor: [number, number, number, number];
  metallic: number;
  roughness: number;
  emissive: [number, number, number];
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND';
}

const PAGODA_MATERIALS: PartMaterialSpec[] = [
  { baseColor: [0.62, 0.58, 0.54, 1], metallic: 0.0, roughness: 0.9, emissive: [0, 0, 0], alphaMode: 'OPAQUE' },  // stone
  { baseColor: [0.55, 0.38, 0.22, 1], metallic: 0.0, roughness: 0.7, emissive: [0, 0, 0], alphaMode: 'OPAQUE' },  // wood
  { baseColor: [0.36, 0.16, 0.12, 1], metallic: 0.0, roughness: 0.6, emissive: [0, 0, 0], alphaMode: 'OPAQUE' },  // roof
  { baseColor: [0.85, 0.72, 0.3, 1], metallic: 0.8, roughness: 0.3, emissive: [0.1, 0.08, 0], alphaMode: 'OPAQUE' }, // gold spire
];

export function pagodaMaterialSpecs(): PartMaterialSpec[] {
  return PAGODA_MATERIALS.map((m) => ({ ...m, baseColor: [...m.baseColor] as [number, number, number, number], emissive: [...m.emissive] as [number, number, number] }));
}

// ---------------------------------------------------------------------------
// Geometry artifact
// ---------------------------------------------------------------------------

function buildGeometryArtifact(source: PagodaSourceMesh): GeometryArtifact {
  const { positions, normals, uvs, indices, bounds } = source;
  const vertexCount = positions.length / 3;
  const triangleCount = indices.length / 3;
  const hash = hashGeometry({ positions, uvs, normals, indices });
  return {
    hash,
    positions,
    indices,
    normals,
    uvs,
    vertexCount,
    triangleCount,
    bounds: {
      min: [bounds.min[0], bounds.min[1], bounds.min[2]],
      max: [bounds.max[0], bounds.max[1], bounds.max[2]],
    },
  };
}

// ---------------------------------------------------------------------------
// Semantic parts (per source part)
// ---------------------------------------------------------------------------

function buildSemanticParts(source: PagodaSourceMesh): {
  parts: SemanticPart[];
  relationships: StructuralRelation[];
} {
  const parts: SemanticPart[] = [];
  for (const part of source.parts) {
    const range = source.partTriRanges.get(part.partId)!;
    const triangleNumbers = new Uint32Array(range.count);
    for (let t = 0; t < range.count; t++) {
      triangleNumbers[t] = range.start + t;
    }
    parts.push({
      partId: part.partId,
      name: part.name,
      category: part.category,
      triangleIndices: triangleNumbers,
      bounds: partBounds(source, range),
      editable: part.editable,
      extractable: part.editable,
      materialIndex: part.materialIndex,
    });
  }
  // Attachment chain: base → tier1 → tier2 → roof → spire.
  const relationships: StructuralRelation[] = [];
  const order = source.parts.map((p) => p.partId);
  for (let i = 0; i < order.length - 1; i++) {
    relationships.push({
      type: 'attached',
      fromPartId: order[i]!,
      toPartId: order[i + 1]!,
    });
  }
  return { parts, relationships };
}

function partBounds(
  source: PagodaSourceMesh,
  range: { start: number; count: number },
): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let t = range.start; t < range.start + range.count; t++) {
    for (let c = 0; c < 3; c++) {
      const v = source.indices[t * 3 + c]! * 3;
      for (let a = 0; a < 3; a++) {
        const x = source.positions[v + a]!;
        min[a] = Math.min(min[a], x);
        max[a] = Math.max(max[a], x);
      }
    }
  }
  return { min, max };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface BuildSemanticOptions {
  assetId: string;
  seed: number;
  instruction: string;
  createdAt?: string;
}

/**
 * Build a complete SemanticAsset from the procedural pagoda source.
 *
 * Provenance follows corpus doc 50 §7: source truth → specification →
 * blueprint → implementation, with generator id, seed and style grammar
 * recorded so the Grand Architect can answer "why does this look the way
 * it does?".
 */
export function buildPagodaSemanticAsset(
  source: PagodaSourceMesh,
  opts: BuildSemanticOptions,
): SemanticAsset {
  const geometry = buildGeometryArtifact(source);

  const materials: MaterialArtifact[] = PAGODA_MATERIALS.map((m, i) => ({
    materialId: `pagoda.mat.${i}`,
    baseColor: m.baseColor,
    metallic: m.metallic,
    roughness: m.roughness,
    emissive: m.emissive,
    alphaMode: m.alphaMode,
  }));

  const { parts, relationships } = buildSemanticParts(source);

  // Attachment points: apex of the spire (top vertex) and the tier1
  // entrance (front-bottom center of tier1).
  const attachmentPoints: AttachmentPoint[] = [
    { pointId: 'pagoda.apex', position: [geometry.bounds.max[0], geometry.bounds.max[1], geometry.bounds.max[2]], socketType: 'ornament' },
    { pointId: 'pagoda.entrance', position: [0, 1.2, geometry.bounds.max[2] - 0.01], socketType: 'door' },
  ];

  const editableRegions: EditableRegion[] = parts.map((p) => ({
    regionId: `region.${p.partId}`,
    bounds: p.bounds,
    partIds: [p.partId],
    protected: !p.editable,
    description: `${p.name} — ${!p.editable ? 'protected' : 'editable'} semantic region`,
  }));

  const extent: [number, number, number] = [
    geometry.bounds.max[0] - geometry.bounds.min[0],
    geometry.bounds.max[1] - geometry.bounds.min[1],
    geometry.bounds.max[2] - geometry.bounds.min[2],
  ];
  const dimensions: AssetDimensions = {
    widthMeters: extent[0],
    heightMeters: extent[1],
    depthMeters: extent[2],
    importScale: [1, 1, 1],
    pivotOffset: [0, 0, 0],
  };

  const canonicalViews: CaptureReference[] = [];

  const asset: SemanticAsset = {
    assetId: opts.assetId,
    revision: 1,
    geometry,
    materials,
    semanticParts: { parts, relationships },
    attachmentPoints,
    editableRegions,
    dimensions,
    canonicalViews,
    provenance: {
      source: 'procedural',
      providerId: PAGODA_GENERATOR_ID,
      providerModelVersion: PAGODA_GENERATOR_VERSION,
      instruction: opts.instruction,
      seed: opts.seed,
      sourceAssetRevision: undefined,
      createdAt: opts.createdAt ?? new Date().toISOString(),
      license: 'project-internal',
    },
    validation: { validated: false, checks: [], defects: [] },
  };
  return asset;
}

/** Re-export helper: get part metadata by id. */
export function getPartMeta(parts: PagodaPart[]): Map<string, PagodaPart> {
  return new Map(parts.map((p) => [p.partId, p]));
}
