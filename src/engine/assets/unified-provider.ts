/**
 * Unified 3D Provider Interface — Provider-Neutral Contract
 * =========================================================
 *
 * Every 3D AI provider (Hunyuan3D-Buffalo, Hunyuan3D-2, TRELLIS, future
 * models, procedural generators, even human-authored) must implement this
 * interface. The Asset Forge calls providers through this contract — it
 * never imports a specific provider's SDK directly.
 *
 * This separation ensures:
 *   - Providers can be swapped without changing engine code
 *   - The Frontier Lab can benchmark providers against identical tasks
 *   - The engine never depends on a specific AI model
 *   - Providers produce CANDIDATES, not authoritative assets
 */

import type {
  SemanticAsset,
  CandidateAsset,
  EditableRegion,
  SemanticPart,
  Bounds3,
  CaptureReference,
} from './semantic-asset';

// ---------------------------------------------------------------------------
// Request Types
// ---------------------------------------------------------------------------

export interface AssetUnderstandingRequest {
  /** The asset to understand. */
  asset: SemanticAsset;
  /** Question or instruction about the asset. */
  query: string;
  /** Canonical views to use for understanding. */
  canonicalViews?: CaptureReference[];
}

export interface AssetGenerationRequest {
  /** Text prompt for generation. */
  prompt: string;
  /** Optional reference image (base64 or URL). */
  referenceImage?: string;
  /** Optional style grammar constraints. */
  styleConstraints?: string[];
  /** Target polygon count (0 = provider default). */
  targetTriangleCount?: number;
  /** Deterministic seed (providers should honor if possible). */
  seed?: number;
}

export interface AssetEditingRequest {
  /** Source asset to edit (immutable — provider receives a copy). */
  sourceAsset: SemanticAsset;
  /** Natural-language editing instruction. */
  instruction: string;
  /** Parts to target for editing. */
  targetPartIds: string[];
  /** Parts to protect from editing (must not change). */
  protectedPartIds: string[];
  /** Proposed edit region (from grounding). */
  editRegion: EditableRegion;
  /** Canonical views to use for view selection. */
  canonicalViews?: CaptureReference[];
  /** Deterministic seed. */
  seed?: number;
}

export interface PartExtractionRequest {
  /** Asset to analyze for semantic parts. */
  asset: SemanticAsset;
  /** Optional vocabulary hint (e.g. "sword parts"). */
  vocabularyHint?: string[];
  /** Maximum number of parts to extract. */
  maxParts?: number;
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface AssetUnderstandingResult {
  /** Provider's answer to the query. */
  answer: string;
  /** Parts identified in the answer. */
  referencedParts: string[];
  /** Confidence score (0-1). */
  confidence: number;
  /** Suggested edit regions (if query implies editing). */
  suggestedEditRegions?: EditableRegion[];
}

export interface GeneratedAssetCandidate {
  candidate: CandidateAsset;
  /** Provider's description of what was generated. */
  description: string;
  /** Warnings from the provider. */
  warnings: string[];
}

export interface EditedAssetCandidate {
  candidate: CandidateAsset;
  /** Provider's description of what was actually changed. */
  observedChange: string;
  /** Unexpected differences (changes outside the edit region). */
  unexpectedDifferences: string[];
  /** Whether the provider believes the edit succeeded. */
  success: boolean;
}

export interface SemanticPartCandidate {
  part: SemanticPart;
  confidence: number;
  /** Alternative names for this part. */
  alternativeNames: string[];
}

// ---------------------------------------------------------------------------
// The Provider Contract
// ---------------------------------------------------------------------------

export interface Unified3DProvider {
  /** Unique provider identifier (e.g. "hunyuan3d-buffalo"). */
  readonly providerId: string;
  /** Model version string. */
  readonly modelVersion: string;
  /** Human-readable display name. */
  readonly displayName: string;
  /** Whether this provider is currently available (has inference). */
  readonly available: boolean;
  /** Capabilities this provider supports. */
  readonly capabilities: ProviderCapability[];

  /** Understand a 3D asset (answer questions, identify parts). */
  understand(
    request: AssetUnderstandingRequest,
  ): Promise<AssetUnderstandingResult>;

  /** Generate a new 3D asset from text/image. */
  generate(
    request: AssetGenerationRequest,
  ): Promise<GeneratedAssetCandidate>;

  /** Edit an existing asset with a natural-language instruction. */
  edit(
    request: AssetEditingRequest,
  ): Promise<EditedAssetCandidate>;

  /** Extract semantic parts from an asset. */
  extractParts(
    request: PartExtractionRequest,
  ): Promise<SemanticPartCandidate[]>;
}

export interface ProviderCapability {
  capability: 'understand' | 'generate' | 'edit' | 'extract-parts';
  /** Whether this capability is actually implemented (not just registered). */
  implemented: boolean;
  /** Estimated latency in seconds (if known). */
  estimatedLatencySec?: number;
  /** Whether this requires a remote GPU. */
  requiresRemoteGPU?: boolean;
  /** Hardware requirements (if known). */
  hardwareRequirements?: string;
}
