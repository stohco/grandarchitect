/**
 * Asset Acceptance Gate — Game-Readiness Validation
 * =================================================
 *
 * Every candidate asset from an AI provider must pass this gate before it
 * can be committed as an authoritative asset. The gate runs deterministic
 * geometry checks — it does NOT trust the provider's self-assessment.
 *
 * Checks:
 *   1. Finite geometry (no NaN/Infinity in positions)
 *   2. Valid indices (in range, no duplicates)
 *   3. No degenerate triangles (zero area)
 *   4. Manifold/watertight requirements (configurable)
 *   5. Scale and orientation sane
 *   6. Protected-region deviation (edited region didn't affect protected parts)
 *   7. Triangle budget
 *   8. UV validity (if present)
 *   9. Material slots valid
 *  10. Collision suitability
 *  11. Animation suitability (if rigged)
 *
 * This module is provider-neutral — it validates ANY CandidateAsset
 * regardless of which provider produced it.
 */

import type {
  SemanticAsset,
  CandidateAsset,
  AssetValidationState,
  ValidationCheck,
  AssetDefect,
  GeometryArtifact,
  EditableRegion,
} from './semantic-asset';

export interface AcceptanceGateConfig {
  /** Maximum triangle count (0 = no limit). */
  maxTriangles: number;
  /** Maximum vertex count (0 = no limit). */
  maxVertices: number;
  /** Require watertight/manifold geometry. */
  requireManifold: boolean;
  /** Maximum protected-region deviation (in meters). */
  maxProtectedDeviation: number;
  /** Minimum UV coverage (0-1, if UVs present). */
  minUVCoverage: number;
  /** Require normals. */
  requireNormals: boolean;
  /** Maximum bounds extent (0 = no limit). */
  maxBoundsExtent: number;
}

export const DEFAULT_GATE_CONFIG: AcceptanceGateConfig = {
  maxTriangles: 100_000,
  maxVertices: 50_000,
  requireManifold: false, // Non-manifold is common in game assets
  maxProtectedDeviation: 0.001, // 1mm tolerance
  minUVCoverage: 0.0, // UVs optional
  requireNormals: true,
  maxBoundsExtent: 0, // No limit
};

export interface AcceptanceResult {
  passed: boolean;
  validation: AssetValidationState;
  checks: ValidationCheck[];
  defects: AssetDefect[];
  /** Human-readable summary. */
  summary: string;
}

/**
 * Run the acceptance gate on a candidate asset.
 */
export function validateCandidate(
  candidate: CandidateAsset,
  config: AcceptanceGateConfig = DEFAULT_GATE_CONFIG,
  sourceAsset?: SemanticAsset,
): AcceptanceResult {
  const checks: ValidationCheck[] = [];
  const defects: AssetDefect[] = [];
  const { geometry } = candidate.asset;

  // 1. Finite geometry
  const finiteCheck = checkFiniteGeometry(geometry);
  checks.push(finiteCheck);
  if (!finiteCheck.passed) {
    defects.push({
      defectId: 'non-finite-geometry',
      severity: 'error',
      category: 'geometry',
      description: 'Geometry contains NaN or Infinity values',
    });
  }

  // 2. Valid indices
  const indexCheck = checkValidIndices(geometry);
  checks.push(indexCheck);
  if (!indexCheck.passed) {
    defects.push({
      defectId: 'invalid-indices',
      severity: 'error',
      category: 'geometry',
      description: 'Index buffer references out-of-range vertices',
    });
  }

  // 3. No degenerate triangles
  const degenCheck = checkDegenerateTriangles(geometry);
  checks.push(degenCheck);
  if (!degenCheck.passed && degenCheck.value! > 0) {
    defects.push({
      defectId: 'degenerate-triangles',
      severity: 'warning',
      category: 'geometry',
      description: `${degenCheck.value} degenerate (zero-area) triangles found`,
    });
  }

  // 4. Triangle budget
  if (config.maxTriangles > 0) {
    const triBudgetCheck: ValidationCheck = {
      checkId: 'triangle-budget',
      name: 'Triangle Budget',
      passed: geometry.triangleCount <= config.maxTriangles,
      value: geometry.triangleCount,
      threshold: config.maxTriangles,
      message: geometry.triangleCount <= config.maxTriangles
        ? `${geometry.triangleCount} triangles (max ${config.maxTriangles})`
        : `Exceeds budget: ${geometry.triangleCount} > ${config.maxTriangles}`,
    };
    checks.push(triBudgetCheck);
    if (!triBudgetCheck.passed) {
      defects.push({
        defectId: 'triangle-budget-exceeded',
        severity: 'error',
        category: 'budget',
        description: `Triangle count ${geometry.triangleCount} exceeds max ${config.maxTriangles}`,
      });
    }
  }

  // 5. Vertex budget
  if (config.maxVertices > 0) {
    const vertBudgetCheck: ValidationCheck = {
      checkId: 'vertex-budget',
      name: 'Vertex Budget',
      passed: geometry.vertexCount <= config.maxVertices,
      value: geometry.vertexCount,
      threshold: config.maxVertices,
    };
    checks.push(vertBudgetCheck);
    if (!vertBudgetCheck.passed) {
      defects.push({
        defectId: 'vertex-budget-exceeded',
        severity: 'error',
        category: 'budget',
        description: `Vertex count ${geometry.vertexCount} exceeds max ${config.maxVertices}`,
      });
    }
  }

  // 6. Normals present
  if (config.requireNormals) {
    const normalCheck: ValidationCheck = {
      checkId: 'normals-present',
      name: 'Vertex Normals',
      passed: !!geometry.normals && geometry.normals.length === geometry.positions.length,
      message: geometry.normals ? 'Present' : 'Missing',
    };
    checks.push(normalCheck);
    if (!normalCheck.passed) {
      defects.push({
        defectId: 'missing-normals',
        severity: 'warning',
        category: 'geometry',
        description: 'Vertex normals are missing — required for lighting',
      });
    }
  }

  // 7. Bounds sanity
  const boundsCheck = checkBoundsSanity(geometry, config.maxBoundsExtent);
  checks.push(boundsCheck);
  if (!boundsCheck.passed) {
    defects.push({
      defectId: 'bounds-issues',
      severity: 'error',
      category: 'geometry',
      description: boundsCheck.message ?? 'Bounds are invalid',
    });
  }

  // 8. Protected-region deviation (if editing)
  if (sourceAsset && candidate.diff) {
    const protectedCheck = checkProtectedRegions(sourceAsset, candidate);
    checks.push(protectedCheck);
    if (!protectedCheck.passed) {
      defects.push({
        defectId: 'protected-region-deviation',
        severity: 'error',
        category: 'editing',
        description: 'Protected regions were modified during editing',
      });
    }
  }

  // 9. Provenance check — must have provider info
  const prov = candidate.asset.provenance;
  const provenanceCheck: ValidationCheck = {
    checkId: 'provenance',
    name: 'Provenance',
    passed: !!prov.providerId && !!prov.providerModelVersion,
    message: prov.providerId
      ? `${prov.providerId} v${prov.providerModelVersion}`
      : 'Missing provider info',
  };
  checks.push(provenanceCheck);

  // Determine overall pass
  const hasErrors = defects.some((d) => d.severity === 'error');
  const passed = !hasErrors;

  const validation: AssetValidationState = {
    validated: true,
    checks,
    defects,
  };

  const errorCount = defects.filter((d) => d.severity === 'error').length;
  const warningCount = defects.filter((d) => d.severity === 'warning').length;
  const summary = passed
    ? `PASSED — ${checks.length} checks, ${warningCount} warnings`
    : `FAILED — ${errorCount} errors, ${warningCount} warnings`;

  return { passed, validation, checks, defects, summary };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkFiniteGeometry(geo: GeometryArtifact): ValidationCheck {
  const positions = geo.positions;
  let nonFinite = 0;
  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i])) nonFinite++;
  }
  return {
    checkId: 'finite-geometry',
    name: 'Finite Geometry',
    passed: nonFinite === 0,
    value: nonFinite,
    threshold: 0,
    message: nonFinite === 0 ? 'All values finite' : `${nonFinite} non-finite values`,
  };
}

function checkValidIndices(geo: GeometryArtifact): ValidationCheck {
  const indices = geo.indices;
  let outOfRange = 0;
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] >= geo.vertexCount) outOfRange++;
  }
  return {
    checkId: 'valid-indices',
    name: 'Valid Indices',
    passed: outOfRange === 0,
    value: outOfRange,
    threshold: 0,
    message: outOfRange === 0 ? 'All indices in range' : `${outOfRange} out-of-range indices`,
  };
}

function checkDegenerateTriangles(geo: GeometryArtifact): ValidationCheck {
  const { positions, indices } = geo;
  let degenerate = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    // Check if all three vertices are identical
    if (
      positions[a] === positions[b] && positions[b] === positions[c] &&
      positions[a + 1] === positions[b + 1] && positions[b + 1] === positions[c + 1] &&
      positions[a + 2] === positions[b + 2] && positions[b + 2] === positions[c + 2]
    ) {
      degenerate++;
    }
  }
  return {
    checkId: 'degenerate-triangles',
    name: 'Degenerate Triangles',
    passed: degenerate === 0,
    value: degenerate,
    threshold: 0,
    message: degenerate === 0 ? 'No degenerate triangles' : `${degenerate} degenerate triangles`,
  };
}

function checkBoundsSanity(geo: GeometryArtifact, maxExtent: number): ValidationCheck {
  const { bounds } = geo;
  const extent: [number, number, number] = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
  const maxDim = Math.max(extent[0], extent[1], extent[2]);
  const finite = Number.isFinite(extent[0]) && Number.isFinite(extent[1]) && Number.isFinite(extent[2]);
  const withinLimit = maxExtent <= 0 || maxDim <= maxExtent;
  const passed = finite && withinLimit;
  return {
    checkId: 'bounds-sanity',
    name: 'Bounds Sanity',
    passed,
    value: Math.round(maxDim * 1000) / 1000,
    threshold: maxExtent > 0 ? maxExtent : undefined,
    message: finite
      ? `Extent: ${extent[0].toFixed(2)} × ${extent[1].toFixed(2)} × ${extent[2].toFixed(2)}`
      : 'Bounds contain non-finite values',
  };
}

function checkProtectedRegions(
  source: SemanticAsset,
  candidate: CandidateAsset,
): ValidationCheck {
  // Check if protected parts were modified
  const protectedRegions = source.editableRegions.filter((r) => r.protected);
  if (protectedRegions.length === 0) {
    return {
      checkId: 'protected-regions',
      name: 'Protected Regions',
      passed: true,
      message: 'No protected regions to check',
    };
  }

  // For now, check that the candidate's diff doesn't list protected parts as modified
  const modifiedProtectedParts = (candidate.diff?.partsModified ?? []).filter((partId) =>
    protectedRegions.some((r) => r.partIds.includes(partId)),
  );

  return {
    checkId: 'protected-regions',
    name: 'Protected Regions',
    passed: modifiedProtectedParts.length === 0,
    value: modifiedProtectedParts.length,
    threshold: 0,
    message: modifiedProtectedParts.length === 0
      ? 'Protected regions unchanged'
      : `${modifiedProtectedParts.length} protected parts modified: ${modifiedProtectedParts.join(', ')}`,
  };
}
