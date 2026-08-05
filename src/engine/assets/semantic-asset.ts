/**
 * Semantic Asset Representation — Provider-Neutral
 * ================================================
 *
 * This is the ENGINE-OWNED asset representation. It does NOT belong to any
 * AI provider (not Buffalo, not Hunyuan3D, not any future model).
 *
 * Every provider — AI generators, procedural modelers, human-authored
 * imports, Blender exports — must produce assets that conform to this
 * interface. The engine's asset pipeline, operation graph, Visual Evidence
 * Fabric, and game runtime all consume this representation.
 *
 * Inspired by the Hunyuan3D-Buffalo paper's principle that understanding,
 * generation, editing, and part semantics should share one representation.
 * But this interface is provider-neutral: Buffalo is one possible provider
 * that can populate it, not the owner of it.
 */

// ---------------------------------------------------------------------------
// Core Geometry
// ---------------------------------------------------------------------------

export interface GeometryArtifact {
  /** Content-addressed hash of the vertex + index buffers. */
  hash: string;
  /** Vertex positions, flattened [x0,y0,z0, x1,y1,z1, ...]. */
  positions: Float32Array;
  /** Triangle indices into the positions array. */
  indices: Uint32Array;
  /** Optional vertex normals. */
  normals?: Float32Array;
  /** Optional UV coordinates, flattened [u0,v0, u1,v1, ...]. */
  uvs?: Float32Array;
  /** Optional vertex colors, flattened [r0,g0,b0, ...]. */
  colors?: Float32Array;
  /** Number of vertices. */
  vertexCount: number;
  /** Number of triangles. */
  triangleCount: number;
  /** Bounding box in local space. */
  bounds: Bounds3;
}

export interface MaterialArtifact {
  materialId: string;
  baseColor?: [number, number, number, number];
  metallic?: number;
  roughness?: number;
  emissive?: [number, number, number];
  baseColorTexture?: string;
  normalTexture?: string;
  metallicRoughnessTexture?: string;
  emissiveTexture?: string;
  alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND';
  alphaCutoff?: number;
  doubleSided?: boolean;
}

export interface Bounds3 {
  min: [number, number, number];
  max: [number, number, number];
}

// ---------------------------------------------------------------------------
// Semantic Parts
// ---------------------------------------------------------------------------

export interface SemanticPart {
  partId: string;
  name: string;
  category: string;
  triangleIndices: Uint32Array;
  bounds: Bounds3;
  editable: boolean;
  extractable: boolean;
  attachmentPoints?: AttachmentPoint[];
}

export interface SemanticPartGraph {
  parts: SemanticPart[];
  relationships: StructuralRelation[];
}

export interface StructuralRelation {
  type: 'attached' | 'contains' | 'adjacent' | 'symmetric' | 'articulated';
  fromPartId: string;
  toPartId: string;
  joint?: AttachmentPoint;
}

export interface AttachmentPoint {
  pointId: string;
  position: [number, number, number];
  orientation?: [number, number, number, number];
  socketType?: string;
  partId?: string;
}

// ---------------------------------------------------------------------------
// Editable Regions
// ---------------------------------------------------------------------------

export interface EditableRegion {
  regionId: string;
  bounds: Bounds3;
  partIds: string[];
  triangleMask?: Uint32Array;
  protected: boolean;
  description?: string;
}

// ---------------------------------------------------------------------------
// Asset Dimensions and Views
// ---------------------------------------------------------------------------

export interface AssetDimensions {
  widthMeters: number;
  heightMeters: number;
  depthMeters: number;
  importScale: [number, number, number];
  pivotOffset: [number, number, number];
  orientationCorrection?: [number, number, number, number];
}

export interface CaptureReference {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
  imageHash?: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Provenance and Validation
// ---------------------------------------------------------------------------

export interface AssetProvenance {
  source: 'procedural' | 'ai-generated' | 'ai-edited' | 'human-authored' | 'imported' | 'placeholder';
  providerId?: string;
  providerModelVersion?: string;
  instruction?: string;
  seed?: number;
  sourceAssetRevision?: number;
  createdAt: string;
  commitSha?: string;
  license?: string;
}

export interface AssetValidationState {
  validated: boolean;
  checks: ValidationCheck[];
  defects: AssetDefect[];
}

export interface ValidationCheck {
  checkId: string;
  name: string;
  passed: boolean;
  message?: string;
  value?: number;
  threshold?: number;
}

export interface AssetDefect {
  defectId: string;
  severity: 'info' | 'warning' | 'error';
  category: string;
  description: string;
  affectedParts?: string[];
}

// ---------------------------------------------------------------------------
// The Complete Semantic Asset
// ---------------------------------------------------------------------------

export interface SemanticAsset {
  assetId: string;
  revision: number;
  geometry: GeometryArtifact;
  materials: MaterialArtifact[];
  semanticParts: SemanticPartGraph;
  attachmentPoints: AttachmentPoint[];
  editableRegions: EditableRegion[];
  dimensions: AssetDimensions;
  canonicalViews: CaptureReference[];
  provenance: AssetProvenance;
  validation: AssetValidationState;
}

// ---------------------------------------------------------------------------
// Candidate Asset
// ---------------------------------------------------------------------------

export interface CandidateAsset {
  candidateId: string;
  asset: SemanticAsset;
  status: 'pending' | 'processing' | 'validated' | 'preview' | 'accepted' | 'rejected';
  diff?: AssetDiff;
  createdAt: string;
}

export interface AssetDiff {
  triangleDelta: number;
  vertexDelta: number;
  boundsDelta?: Bounds3;
  partsAdded: string[];
  partsRemoved: string[];
  partsModified: string[];
  chamferDistance?: number;
  f1Score?: number;
}

// ---------------------------------------------------------------------------
// AI Asset Edit Operation (operation-graph node)
// ---------------------------------------------------------------------------

export interface AIAssetEditNode {
  id: string;
  type: 'ai-asset-edit';
  sourceAssetHash: string;
  sourceAssetRevision: number;
  providerId: string;
  providerVersion: string;
  instruction: string;
  seed?: number;
  targetPartIds: string[];
  protectedPartIds: string[];
  proposedEditRegion: EditableRegion;
  acceptedEditRegion?: EditableRegion;
  rawCandidateHash?: string;
  processedCandidateHash?: string;
  status: 'planned' | 'generating' | 'generated' | 'processing' | 'validation-failed' | 'preview' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
