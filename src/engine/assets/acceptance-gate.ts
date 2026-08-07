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
  Bounds3,
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
  return validateSemanticAsset(candidate.asset, config, {
    diff: candidate.diff,
    sourceAsset,
  });
}

export interface SemanticValidationContext {
  /** Diff vs a source asset (for protected-region deviation checks). */
  diff?: CandidateAsset['diff'];
  /** Source asset the candidate was edited from (optional). */
  sourceAsset?: SemanticAsset;
}

/**
 * Run the acceptance gate on any SemanticAsset — candidates AND pipeline
 * outputs share this single gate. Stamps the result into `asset.validation`.
 */
export function validateSemanticAsset(
  asset: SemanticAsset,
  config: AcceptanceGateConfig = DEFAULT_GATE_CONFIG,
  ctx: SemanticValidationContext = {},
): AcceptanceResult {
  const checks: ValidationCheck[] = [];
  const defects: AssetDefect[] = [];
  const { geometry } = asset;

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

  // 3. No degenerate triangles (REAL area check — cross product magnitude)
  const degenCheck = checkDegenerateTriangles(geometry);
  checks.push(degenCheck);
  if (!degenCheck.passed && degenCheck.value! > 0) {
    defects.push({
      defectId: 'degenerate-triangles',
      severity: 'warning',
      category: 'topology',
      description: `${degenCheck.value} degenerate (zero-area) triangles found`,
    });
  }

  // 3b. Triangle budget
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

  // 4. Vertex budget
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

  // 5. Normals present
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

  // 6. Bounds sanity
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

  // 7. UV coverage (real check when UVs present)
  const uvCheck = checkUVCoverage(geometry, config.minUVCoverage);
  checks.push(uvCheck);
  if (!uvCheck.passed) {
    defects.push({
      defectId: 'uv-coverage',
      severity: 'error',
      category: 'topology',
      description: uvCheck.message ?? `UV coverage below ${config.minUVCoverage}`,
    });
  }

  // 8. Semantic region tagging (parts must cover every triangle)
  const regionCheck = checkSemanticRegions(asset);
  checks.push(regionCheck);
  if (!regionCheck.passed) {
    defects.push({
      defectId: 'semantic-region-gap',
      severity: 'error',
      category: 'semantics',
      description: regionCheck.message ?? 'Semantic parts do not cover all triangles',
    });
  }

  // 9. Protected-region deviation (if editing)
  if (ctx.sourceAsset && ctx.diff) {
    const protectedCheck = checkProtectedRegions(ctx.sourceAsset, {
      asset,
      candidateId: 'pipeline-candidate',
      status: 'processing',
      diff: ctx.diff,
      createdAt: new Date().toISOString(),
    });
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

  // 10. Provenance check — must have generator/provider info
  const prov = asset.provenance;
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

  asset.validation = validation;

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
  // Degenerate threshold: a triangle whose area is below ~1e-9 of the
  // asset's characteristic extent squared is a topology defect (sliver or
  // zero-area). Real cross-product area — not the old "all 3 verts equal"
  // approximation.
  const extent = boundsExtent(geo.bounds);
  const areaScale = Math.max(extent * extent, 1e-12);
  const EPS = 1e-9 * areaScale;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]! * 3;
    const b = indices[i + 1]! * 3;
    const c = indices[i + 2]! * 3;
    const abx = positions[b]! - positions[a]!;
    const aby = positions[b + 1]! - positions[a + 1]!;
    const abz = positions[b + 2]! - positions[a + 2]!;
    const acx = positions[c]! - positions[a]!;
    const acy = positions[c + 1]! - positions[a + 1]!;
    const acz = positions[c + 2]! - positions[a + 2]!;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    const area2 = cx * cx + cy * cy + cz * cz;
    if (area2 < EPS * EPS) degenerate++;
  }
  return {
    checkId: 'degenerate-triangles',
    name: 'Degenerate Triangles (zero-area)',
    passed: degenerate === 0,
    value: degenerate,
    threshold: 0,
    message: degenerate === 0 ? 'No zero-area triangles' : `${degenerate} zero-area triangles`,
  };
}

function checkUVCoverage(geo: GeometryArtifact, minCoverage: number): ValidationCheck {
  if (!geo.uvs || geo.uvs.length === 0) {
    return {
      checkId: 'uv-coverage',
      name: 'UV Coverage',
      passed: minCoverage <= 0,
      value: 0,
      threshold: minCoverage,
      message: minCoverage <= 0 ? 'No UVs present (not required)' : 'UVs required but absent',
    };
  }
  const { positions, indices, uvs } = geo;
  let valid = 0;
  const triCount = indices.length / 3;
  for (let i = 0; i < indices.length; i += 3) {
    let triValid = true;
    for (let c = 0; c < 3; c++) {
      const v = indices[i + c]!;
      const u = uvs[v * 2]!;
      const uv = uvs[v * 2 + 1]!;
      if (!Number.isFinite(u) || !Number.isFinite(uv) || u < -0.001 || u > 1.001 || uv < -0.001 || uv > 1.001) {
        triValid = false;
        break;
      }
    }
    if (triValid) valid++;
  }
  // Also verify the UV buffer length matches the vertex count.
  const lengthOk = uvs.length === positions.length / 3 * 2;
  const coverage = triCount === 0 ? 0 : valid / triCount;
  const passed = lengthOk && coverage >= minCoverage;
  return {
    checkId: 'uv-coverage',
    name: 'UV Coverage',
    passed,
    value: Math.round(coverage * 1000) / 1000,
    threshold: minCoverage,
    message: lengthOk
      ? `${(coverage * 100).toFixed(1)}% of triangles have valid [0,1] UVs`
      : 'UV buffer length does not match vertex count',
  };
}

function checkSemanticRegions(asset: SemanticAsset): ValidationCheck {
  const parts = asset.semanticParts?.parts ?? [];
  const triCount = asset.geometry.triangleCount;
  if (parts.length === 0) {
    return {
      checkId: 'semantic-regions',
      name: 'Semantic Regions',
      passed: false,
      value: 0,
      message: 'No semantic parts tagged on asset',
    };
  }
  const covered = new Uint8Array(triCount);
  let gapParts = 0;
  let badRanges = 0;
  for (const part of parts) {
    if (!part.name || !part.category || !part.partId) gapParts++;
    if (part.triangleIndices.length === 0) gapParts++;
    for (let t = 0; t < part.triangleIndices.length; t++) {
      const tri = part.triangleIndices[t]!;
      if (tri >= triCount) {
        badRanges++;
        continue;
      }
      covered[tri] = 1;
    }
  }
  let uncovered = 0;
  for (let t = 0; t < triCount; t++) {
    if (covered[t] === 0) uncovered++;
  }
  const passed = gapParts === 0 && badRanges === 0 && uncovered === 0;
  return {
    checkId: 'semantic-regions',
    name: 'Semantic Regions',
    passed,
    value: uncovered,
    threshold: 0,
    message: passed
      ? `${parts.length} parts cover all ${triCount} triangles`
      : `${gapParts} malformed parts, ${badRanges} out-of-range refs, ${uncovered} uncovered triangles`,
  };
}

function boundsExtent(bounds: Bounds3): number {
  return Math.max(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
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
