/**
 * GET /api/frontier/collision-tests
 *
 * Runs all collision fixtures and returns results.
 *
 * Response shape:
 *   {
 *     tests: [{
 *       name: string,
 *       passed: boolean,
 *       details: string,
 *       finalPosition: { x, y, z },
 *       grounded: boolean,
 *       nanTicks: number,
 *       fellThrough: boolean,
 *       trajectoryHash: string,
 *       ticks: number
 *     }],
 *     summary: { total, passed, failed },
 *     terrain: { hash, spawn, checkpoints, validationOk }
 *   }
 *
 * The `terrain` block runs the terrain pipeline (density field + tunnel spline)
 * and reports the density-field hash, the spawn point, the 5 checkpoints, and
 * whether the density validation passed (no NaN).
 *
 * Determinism: same input → same output, every run. No Math.random anywhere
 * in the simulation path.
 */

import { NextResponse } from 'next/server';
import { runCollisionTests, validateFixtureMesh, allFixtures } from '@/engine/frontier/collision-fixtures';
import { generateTerrainPipeline } from '@/engine/frontier/terrain-plugin';
import { bvhDepth, bvhAverageLeafSize } from '@/engine/frontier/bvh';
import { buildBVH } from '@/engine/frontier/bvh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Run the collision fixtures.
    const collisionResult = runCollisionTests(100);

    // 2. Validate each fixture mesh (sanity check).
    const fixtureValidation = allFixtures().map(f => ({
      name: f.name,
      ...validateFixtureMesh(f.mesh),
    }));

    // 3. BVH diagnostics for each fixture.
    const bvhDiagnostics = allFixtures().map(f => {
      const bvh = buildBVH(f.mesh.positions, f.mesh.indices);
      return {
        name: f.name,
        triangleCount: bvh.triangleCount,
        nodeCount: bvh.nodeCount,
        depth: bvhDepth(bvh),
        averageLeafSize: Number(bvhAverageLeafSize(bvh).toFixed(2)),
      };
    });

    // 4. Run the terrain pipeline (deterministic — fixed seed).
    const terrainSeed = 0x7E000000 ^ 0x12345678;
    const terrain = generateTerrainPipeline(terrainSeed >>> 0);

    // 5. Build response.
    return NextResponse.json({
      tests: collisionResult.tests,
      summary: collisionResult.summary,
      fixtureValidation,
      bvhDiagnostics,
      terrain: {
        hash: terrain.hash,
        spawn: terrain.spawn,
        checkpoints: terrain.checkpoints,
        fieldSize: terrain.field.size,
        fieldWorldSize: terrain.field.worldSize,
        voxelCount: terrain.field.data.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      {
        error: message,
        stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
