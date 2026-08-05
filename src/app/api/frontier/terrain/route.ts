/**
 * GET /api/frontier/terrain
 *
 * Runs the real terrain reference plugin and returns the actual geometry
 * as serialized arrays. The viewport can then render this as a real mesh.
 *
 * Query params:
 *   resolution: voxel resolution (default 24, max 48 for performance)
 *   seed: deterministic seed (default 42)
 *
 * Returns: {
 *   renderMesh: { positions: number[], normals: number[], indices: number[], materialIds: number[], vertexCount, triangleCount, artifactHash },
 *   navigation: { polygonCount, linkCount, pathLength },
 *   vegetation: { instanceCount, transforms: number[], artifactHash },
 *   bundle: { recipeHash, artifactHash, status },
 *   region: { resolution, solidVoxels, densityHash }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createDensityRegion, TerrainSourceOp, SdfMountainOp, SplineTunnelOp, ErosionOp,
  extractSurface, generateCollision, generateNavigation, findPath,
  scatterVegetation, buildBundle, DetPRNG,
} from '@/engine/frontier/terrain-plugin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolution = Math.min(48, Math.max(8, parseInt(searchParams.get('resolution') ?? '24', 10)));
    const seed = parseInt(searchParams.get('seed') ?? '42', 10);

    // Create density region (128m x 64m x 128m)
    const region = createDensityRegion(
      `region-${seed}-${resolution}`,
      1,
      { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 },
      resolution,
    );

    const ctx = { seed, rng: new DetPRNG(seed) };

    // Run the real terrain pipeline
    new TerrainSourceOp({ seed, baseHeight: 20, variation: 15 }).evaluate(region, ctx);
    new SdfMountainOp({ position: [64, 20, 64], height: 40, radius: 30 }).evaluate(region, ctx);
    new SplineTunnelOp({ splinePoints: [[10, 25, 64], [64, 30, 64], [118, 25, 64]], radius: 3 }).evaluate(region, ctx);
    new ErosionOp({ iterations: 2, strength: 0.1 }).evaluate(region, ctx);

    // Extract real geometry
    const renderMesh = extractSurface(region);
    const collision = generateCollision(region, renderMesh);
    const navigation = generateNavigation(region);
    const path = findPath(navigation, 10, 64, 118, 64);
    const vegetation = scatterVegetation(region, { species: 'pine', density: 0.3, seed, slopeThreshold: 30 });

    const recipeHash = createHash('sha256').update(`source+mountain+tunnel+erosion-${seed}-${resolution}`).digest('hex');
    const bundle = buildBundle('graph-terrain', 1, region, renderMesh, collision, navigation, vegetation, recipeHash);

    const solidVoxels = region.samples.filter(s => s < 0).length;

    return NextResponse.json({
      renderMesh: {
        positions: Array.from(renderMesh.positions),
        normals: Array.from(renderMesh.normals),
        indices: Array.from(renderMesh.indices),
        materialIds: Array.from(renderMesh.materialIds),
        vertexCount: renderMesh.vertexCount,
        triangleCount: renderMesh.triangleCount,
        artifactHash: renderMesh.artifactHash,
      },
      navigation: {
        polygonCount: navigation.polygonCount,
        linkCount: navigation.links.length,
        pathLength: path?.length ?? 0,
      },
      vegetation: {
        instanceCount: vegetation.instanceCount,
        transforms: Array.from(vegetation.transforms),
        artifactHash: vegetation.artifactHash,
      },
      bundle: {
        recipeHash: bundle.recipeHash,
        artifactHash: bundle.artifactHash,
        status: bundle.status,
        validation: bundle.validation,
      },
      region: {
        resolution,
        solidVoxels,
        densityHash: region.densityHash,
        bounds: region.bounds,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
