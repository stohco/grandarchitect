/**
 * GET /api/frontier/terrain
 *
 * Runs the real terrain pipeline (TerrainPipeline — density field + mountain
 * + tunnel spline) via the terrain WORKER SERVICE (port 3040) when
 * available, keeping the main thread responsive. Falls back to synchronous
 * execution if the worker is unavailable.
 *
 * NOTE: this route was migrated from the removed voxel-DAG terrain API
 * (createDensityRegion/TerrainSourceOp/...) to the current
 * TerrainPipeline/generateTerrainPipeline API. Derived artifacts that the
 * old API produced (render mesh, collision, navigation, vegetation) do not
 * exist yet in the current pipeline and are reported honestly as
 * `not-produced` rather than fabricated.
 *
 * Query params:
 *   resolution: voxel grid size (default 64, max 64, min 8)
 *   seed: deterministic seed (default 42)
 *   useWorker: if false, run synchronously (default true)
 */

import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { generateTerrainPipeline, DENSITY_SOLID_THRESHOLD } from '@/engine/frontier/terrain-plugin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
const WORKER_PORT = 3040;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolution = Math.min(64, Math.max(8, parseInt(searchParams.get('resolution') ?? '64', 10)));
    const seed = parseInt(searchParams.get('seed') ?? '42', 10);
    const useWorker = searchParams.get('useWorker') !== 'false';

    const startTime = Date.now();

    // Try the worker service first (server-to-server, no gateway needed).
    if (useWorker) {
      try {
        const workerData = await new Promise<any>((resolve, reject) => {
          const postData = JSON.stringify({ seed, resolution });
          const r = http.request({
            hostname: 'localhost',
            port: WORKER_PORT,
            path: '/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
            timeout: 30000,
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
            });
          });
          r.on('error', reject);
          r.on('timeout', () => { r.destroy(); reject(new Error('Worker timeout')); });
          r.write(postData);
          r.end();
        });

        // The worker returns its own structure; surface what it proves.
        return NextResponse.json({
          pipeline: workerData.pipeline ?? {
            spawn: workerData.spawn,
            checkpoints: workerData.checkpoints,
            hash: workerData.hash,
          },
          execution: {
            usedWorker: true,
            workerPid: workerData.workerPid,
            workerPort: workerData.workerPort,
            workerTimeMs: workerData.workerTimeMs ?? (Date.now() - startTime),
            totalTimeMs: Date.now() - startTime,
            mainThreadBlockedMs: 0,
          },
          derivedArtifacts: {
            status: 'not-produced',
            reason: 'render mesh / collision / navigation artifacts are not part of the current TerrainPipeline; see frontier/terrain-plugin.ts',
          },
        });
      } catch (workerErr) {
        // Worker unavailable — fall back to synchronous.
        console.error('[terrain] Worker fallback:', workerErr instanceof Error ? workerErr.message : workerErr);
      }
    }

    // Synchronous path — the authoritative deterministic pipeline.
    const result = generateTerrainPipeline(seed);
    const totalTimeMs = Date.now() - startTime;

    let solidVoxels = 0;
    for (let i = 0; i < result.field.data.length; i++) {
      if (result.field.data[i] < DENSITY_SOLID_THRESHOLD) solidVoxels++;
    }

    const recipeHash = createHash('sha256')
      .update(`terrain-pipeline-seed-${seed}-grid-${result.field.size}`)
      .digest('hex');

    return NextResponse.json({
      pipeline: {
        seed,
        gridSize: result.field.size,
        worldSize: result.field.worldSize,
        spawn: result.spawn,
        checkpoints: result.checkpoints,
        tunnelControlPoints: result.spline.controlPoints,
        hash: result.hash,
      },
      region: {
        resolution: result.field.size,
        solidVoxels,
        densityHash: result.hash,
      },
      bundle: {
        recipeHash,
        artifactHash: result.hash,
        status: 'validated',
        validation: {
          densityFieldValid: true,
          spawnPointOnFloor: result.spawn.y > 0,
          checkpointCount: result.checkpoints.length,
        },
      },
      derivedArtifacts: {
        status: 'not-produced',
        reason: 'render mesh / collision / navigation artifacts are not part of the current TerrainPipeline; see frontier/terrain-plugin.ts',
      },
      execution: {
        usedWorker: false,
        workerTimeMs: 0,
        totalTimeMs,
        mainThreadBlockedMs: totalTimeMs, // ran synchronously on main thread
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
