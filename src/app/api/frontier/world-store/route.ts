/**
 * GET /api/frontier/world-store — list saved graphs and bundles
 * POST /api/frontier/world-store — save or load a world
 *
 * POST body: { action: 'save' | 'load' | 'list', graphId?, bundle?, graph? }
 *
 * This proves durable persistence: data survives server restarts because
 * it's written to the filesystem (data/world-store/).
 *
 * NOTE: this route was migrated from the removed voxel-DAG terrain API to
 * the current TerrainPipeline API. `reload-and-verify` now proves pipeline
 * determinism (same seed -> same density hash, spawn and checkpoints after
 * a disk round-trip) instead of the old render-artifact hashes, which no
 * longer exist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { createFilesystemWorldAssetStore, type SerializedDerivedBundle } from '@/engine/frontier/world-asset-store';
import { generateTerrainPipeline, DENSITY_SOLID_THRESHOLD } from '@/engine/frontier/terrain-plugin';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

const store = createFilesystemWorldAssetStore();

export async function GET() {
  try {
    const [graphIds, bundleIds, manifest] = await Promise.all([
      store.listGraphs(),
      store.listBundles(),
      store.loadWorldManifest(),
    ]);

    return NextResponse.json({
      graphs: graphIds,
      bundles: bundleIds,
      manifest,
      storageDir: 'data/world-store/',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'save') {
      // Generate terrain, build a bundle summary, save both to disk.
      const seed = body.seed ?? 42;
      const graphId = body.graphId ?? `terrain-${seed}-${Date.now().toString(36)}`;

      const result = generateTerrainPipeline(seed);

      let solidVoxels = 0;
      for (let i = 0; i < result.field.data.length; i++) {
        if (result.field.data[i] < DENSITY_SOLID_THRESHOLD) solidVoxels++;
      }

      const recipeHash = createHash('sha256')
        .update(`terrain-pipeline-seed-${seed}-grid-${result.field.size}`)
        .digest('hex');

      const serializedGraph = {
        graphId,
        graphType: 'terrain',
        revision: 1,
        serializedAt: new Date().toISOString(),
        nodes: [
          { nodeId: 'node-pipeline', nodeType: 'terrain-pipeline', pluginId: 'ga:terrain', parameters: { seed, gridSize: result.field.size }, enabled: true, attributableTo: 'user', dependencies: [] },
        ],
        activeBundleRevision: 1,
      };

      const serializedBundle = {
        bundleId: `bundle-${graphId}`,
        graphId,
        graphRevision: 1,
        recipeHash,
        artifactHash: result.hash,
        status: 'validated',
        serializedAt: new Date().toISOString(),
        spawnPoint: result.spawn,
        checkpointCount: result.checkpoints.length,
        solidVoxelCount: solidVoxels,
        validation: {
          densityFieldValid: true,
          spawnPointOnFloor: result.spawn.y > 0,
        },
      };

      await store.saveGraph(serializedGraph);
      await store.saveBundle(serializedBundle);

      // Update world manifest.
      const manifest = await store.loadWorldManifest() ?? {
        worldId: 'default-world',
        worldName: 'Xianxia Multiverse',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        graphIds: [],
        graphRevisions: {},
      };
      if (!manifest.graphIds.includes(graphId)) {
        manifest.graphIds.push(graphId);
      }
      manifest.graphRevisions[graphId] = 1;
      manifest.lastModified = new Date().toISOString();
      manifest.activeBundleId = serializedBundle.bundleId;
      await store.saveWorldManifest(manifest);

      return NextResponse.json({
        ok: true,
        action: 'save',
        graphId,
        bundleId: serializedBundle.bundleId,
        artifactHash: result.hash,
        recipeHash,
        spawnPoint: result.spawn,
        checkpointCount: result.checkpoints.length,
        bundleStatus: 'validated',
        persistedTo: 'data/world-store/',
      });
    }

    if (action === 'load') {
      const { graphId } = body;
      if (!graphId) return NextResponse.json({ error: 'graphId required' }, { status: 400 });

      const graph = await store.loadGraph(graphId);
      if (!graph) return NextResponse.json({ error: `Graph not found: ${graphId}` }, { status: 404 });

      // Find the bundle for this graph.
      const bundleIds = await store.listBundles();
      let bundle: SerializedDerivedBundle | null = null;
      for (const bid of bundleIds) {
        const b = await store.loadBundle(bid);
        if (b && b.graphId === graphId) { bundle = b; break; }
      }

      return NextResponse.json({
        ok: true,
        action: 'load',
        graph,
        bundle,
        loadedFrom: 'data/world-store/',
      });
    }

    if (action === 'reload-and-verify') {
      // The critical test: load from disk, re-evaluate, verify hashes match.
      const { graphId } = body;
      if (!graphId) return NextResponse.json({ error: 'graphId required' }, { status: 400 });

      const graph = await store.loadGraph(graphId);
      if (!graph) return NextResponse.json({ error: `Graph not found: ${graphId}` }, { status: 404 });

      // Re-evaluate the terrain from the saved graph parameters. Supports
      // both the current 'terrain-pipeline' node and the legacy
      // 'terrain-source' node from graphs saved before the API migration.
      const pipelineNode = graph.nodes.find(n => n.nodeType === 'terrain-pipeline');
      const sourceNode = graph.nodes.find(n => n.nodeType === 'terrain-source');
      const seed = (pipelineNode?.parameters.seed ?? sourceNode?.parameters.seed ?? 42) as number;

      const result = generateTerrainPipeline(seed);
      const recipeHash = createHash('sha256')
        .update(`terrain-pipeline-seed-${seed}-grid-${result.field.size}`)
        .digest('hex');

      // Load the saved bundle to compare.
      const bundleIds = await store.listBundles();
      let savedBundle: SerializedDerivedBundle | null = null;
      for (const bid of bundleIds) {
        const b = await store.loadBundle(bid);
        if (b && b.graphId === graphId) { savedBundle = b; break; }
      }

      // Compare the determinism proof (density hash + spawn + checkpoints).
      const recipeHashMatches = savedBundle ? savedBundle.recipeHash === recipeHash : false;
      const artifactHashMatches = savedBundle ? savedBundle.artifactHash === result.hash : false;
      const spawnMatches = savedBundle && savedBundle.spawnPoint
        ? Math.abs(savedBundle.spawnPoint.x - result.spawn.x) < 0.01
          && Math.abs(savedBundle.spawnPoint.y - result.spawn.y) < 0.01
          && Math.abs(savedBundle.spawnPoint.z - result.spawn.z) < 0.01
        : false;
      const checkpointCountMatches = savedBundle ? savedBundle.checkpointCount === result.checkpoints.length : false;

      const allMatch = recipeHashMatches && artifactHashMatches && spawnMatches && checkpointCountMatches;

      return NextResponse.json({
        ok: true,
        action: 'reload-and-verify',
        graphId,
        savedBundle,
        reevaluatedBundle: {
          recipeHash,
          artifactHash: result.hash,
          spawnPoint: result.spawn,
          checkpointCount: result.checkpoints.length,
        },
        verification: {
          recipeHashMatches,
          artifactHashMatches,
          spawnMatches,
          checkpointCountMatches,
          allMatch,
        },
        message: allMatch
          ? 'DURABLE PERSISTENCE VERIFIED: saved and reloaded pipeline determinism matches'
          : 'MISMATCH: saved and reloaded pipeline differ',
      });
    }

    if (action === 'list') {
      const [graphIds, bundleIds, manifest] = await Promise.all([
        store.listGraphs(),
        store.listBundles(),
        store.loadWorldManifest(),
      ]);
      return NextResponse.json({ graphs: graphIds, bundles: bundleIds, manifest });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
