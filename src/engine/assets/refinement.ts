/**
 * Geometry Refinement Capability — Provider-Neutral
 * ==================================================
 *
 * Refines the boundary between an edited region and the source geometry.
 * This is the engine-side equivalent of Nano3D-v2's boundary refinement
 * step: after a coarse AI edit, the boundary between edited and source
 * geometry needs stitching to avoid visible seams.
 *
 * Provider-neutral — can be implemented by:
 *   - A built-in mesh stitcher (initial implementation)
 *   - A retopology service
 *   - An AI refinement provider
 *   - A DCC tool adapter (Blender, Maya)
 */

import type { GeometryArtifact, EditableRegion } from './semantic-asset';

export interface GeometryRefinementRequest {
  /** The original source geometry (immutable). */
  source: GeometryArtifact;
  /** The candidate geometry from the AI provider. */
  candidate: GeometryArtifact;
  /** The edit region boundary that needs stitching. */
  editRegion: EditableRegion;
  /** Maximum allowed deviation from the source outside the edit region. */
  maxDeviation: number;
}

export interface GeometryRefinementResult {
  /** The refined geometry with stitched boundaries. */
  refined: GeometryArtifact;
  /** Whether the refinement succeeded. */
  success: boolean;
  /** Measured maximum deviation from source (outside edit region). */
  maxDeviation: number;
  /** Number of vertices modified in the boundary zone. */
  boundaryVerticesModified: number;
  /** Warnings from the refinement process. */
  warnings: string[];
}

export interface GeometryRefinementCapability {
  refineBoundary(input: GeometryRefinementRequest): Promise<GeometryRefinementResult>;
}
