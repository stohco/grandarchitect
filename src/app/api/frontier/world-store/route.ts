/**
 * GET /api/frontier/world-store — list saved graphs and bundles
 * POST /api/frontier/world-store — save or load a world
 *
 * POST body: { action: 'save' | 'load' | 'list', graphId?, bundle?, graph? }
 *
 * This proves durable persistence: data survives server restarts because
 * it's written to the filesystem (data/world-store/).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { createFilesystemWorldAssetStore } from '@/engine/frontier/world-asset-store';
import {
  createDensityRegion, TerrainSourceOp, SdfMountainOp, SplineTunnelOp, ErosionOp,
  extractSurface, generateCollision, generateNavigation, findPath,
  scatterVegetation, buildBundle, DetPRNG,
} from '@/engine/frontier/terrain-plugin';
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
      // Generate terrain, build bundle, save both to disk
      const seed = body.seed ?? 42;
      const resolution = body.resolution ?? 24;
      const graphId = body.graphId ?? `terrain-${seed}-${Date.now().toString(36)}`;

      // Run the terrain pipeline
      const region = createDensityRegion(
        `region-${graphId}`, 1,
        { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 },
        resolution,
      );
      const ctx = { seed, rng: new DetPRNG(seed) };
      new TerrainSourceOp({ seed, baseHeight: 20, variation: 15 }).evaluate(region, ctx);
      new SdfMountainOp({ position: [64, 20, 64], height: 40, radius: 30 }).evaluate(region, ctx);
      new SplineTunnelOp({ splinePoints: [[10, 25, 64], [64, 30, 64], [118, 25, 64]], radius: 3 }).evaluate(region, ctx);
      new ErosionOp({ iterations: 2, strength: 0.1 }).evaluate(region, ctx);

      const renderMesh = extractSurface(region);
      const collision = generateCollision(region, renderMesh);
      const navigation = generateNavigation(region);
      const vegetation = scatterVegetation(region, { species: 'pine', density: 0.3, seed, slopeThreshold: 30 });

      const recipeHash = createHash('sha256').update(`source+mountain+tunnel+erosion-${seed}-${resolution}`).digest('hex');
      const bundle = buildBundle(graphId, 1, region, renderMesh, collision, navigation, vegetation, recipeHash);

      // Serialize and save
      const serializedGraph = {
        graphId,
        graphType: 'terrain',
        revision: 1,
        serializedAt: new Date().toISOString(),
        nodes: [
          { nodeId: 'node-source', nodeType: 'terrain-source', pluginId: 'ga:terrain', parameters: { seed, baseHeight: 20, variation: 15 }, enabled: true, attributableTo: 'user', dependencies: [] },
          { nodeId: 'node-mountain', nodeType: 'sdf-mountain', pluginId: 'ga:terrain', parameters: { position: [64, 20, 64], height: 40, radius: 30 }, enabled: true, attributableTo: 'user', dependencies: ['node-source'] },
          { nodeId: 'node-tunnel', nodeType: 'spline-tunnel', pluginId: 'ga:terrain', parameters: { splinePoints: [[10, 25, 64], [64, 30, 64], [118, 25, 64]], radius: 3 }, enabled: true, attributableTo: 'user', dependencies: ['node-mountain'] },
          { nodeId: 'node-erosion', nodeType: 'erosion', pluginId: 'ga:terrain', parameters: { iterations: 2, strength: 0.1 }, enabled: true, attributableTo: 'architect', dependencies: ['node-tunnel'] },
        ],
        activeBundleRevision: 1,
      };

      const serializedBundle = {
        bundleId: bundle.bundleId,
        graphId,
        graphRevision: 1,
        regionId: region.regionId,
        recipeHash: bundle.recipeHash,
        artifactHash: bundle.artifactHash,
        status: bundle.status,
        serializedAt: new Date().toISOString(),
        renderVertexCount: renderMesh.vertexCount,
        renderTriangleCount: renderMesh.triangleCount,
        collisionVertexCount: collision.vertexCount,
        navigationPolygonCount: navigation.polygonCount,
        vegetationInstanceCount: vegetation.instanceCount,
        validation: bundle.validation,
      };

      await store.saveGraph(serializedGraph);
      await store.saveBundle(serializedBundle);

      // Update world manifest
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
      manifest.activeBundleId = bundle.bundleId;
      await store.saveWorldManifest(manifest);

      return NextResponse.json({
        ok: true,
        action: 'save',
        graphId,
        bundleId: bundle.bundleId,
        artifactHash: bundle.artifactHash,
        recipeHash: bundle.recipeHash,
        renderVertexCount: renderMesh.vertexCount,
        renderTriangleCount: renderMesh.triangleCount,
        navigationPolygonCount: navigation.polygonCount,
        vegetationInstanceCount: vegetation.instanceCount,
        bundleStatus: bundle.status,
        persistedTo: 'data/world-store/',
      });
    }

    if (action === 'load') {
      const { graphId } = body;
      if (!graphId) return NextResponse.json({ error: 'graphId required' }, { status: 400 });

      const graph = await store.loadGraph(graphId);
      if (!graph) return NextResponse.json({ error: `Graph not found: ${graphId}` }, { status: 404 });

      // Find the bundle for this graph
      const bundleIds = await store.listBundles();
      let bundle = null;
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
      // The critical test: load from disk, re-evaluate, verify hashes match
      const { graphId } = body;
      if (!graphId) return NextResponse.json({ error: 'graphId required' }, { status: 400 });

      const graph = await store.loadGraph(graphId);
      if (!graph) return NextResponse.json({ error: `Graph not found: ${graphId}` }, { status: 404 });

      // Re-evaluate the terrain from the saved graph parameters
      const sourceNode = graph.nodes.find(n => n.nodeType === 'terrain-source');
      if (!sourceNode) return NextResponse.json({ error: 'No terrain-source node' }, { status: 400 });

      const seed = sourceNode.parameters.seed as number;
      const resolution = 24; // match the save resolution

      const region = createDensityRegion(
        `region-reload-${graphId}`, graph.revision,
        { minX: 0, maxX: 128, minY: 0, maxY: 64, minZ: 0, maxZ: 128 },
        resolution,
      );
      const ctx = { seed, rng: new DetPRNG(seed) };

      // Re-run all operations from the saved graph
      for (const node of graph.nodes) {
        if (!node.enabled) continue;
        switch (node.nodeType) {
          case 'terrain-source':
            new TerrainSourceOp(node.parameters as any).evaluate(region, ctx);
            break;
          case 'sdf-mountain':
            new SdfMountainOp(node.parameters as any).evaluate(region, ctx);
            break;
          case 'spline-tunnel':
            new SplineTunnelOp(node.parameters as any).evaluate(region, ctx);
            break;
          case 'erosion':
            new ErosionOp(node.parameters as any).evaluate(region, ctx);
            break;
        }
      }

      // Re-extract artifacts
      const renderMesh = extractSurface(region);
      const collision = generateCollision(region, renderMesh);
      const navigation = generateNavigation(region);
      const vegetation = scatterVegetation(region, { species: 'pine', density: 0.3, seed, slopeThreshold: 30 });

      const recipeHash = createHash('sha256').update(`source+mountain+tunnel+erosion-${seed}-${resolution}`).digest('hex');
      const newBundle = buildBundle(graphId, graph.revision, region, renderMesh, collision, navigation, vegetation, recipeHash);

      // Load the saved bundle to compare
      const bundleIds = await store.listBundles();
      let savedBundle = null;
      for (const bid of bundleIds) {
        const b = await store.loadBundle(bid);
        if (b && b.graphId === graphId) { savedBundle = b; break; }
      }

      // Compare hashes
      const recipeHashMatches = savedBundle ? savedBundle.recipeHash === newBundle.recipeHash : false;
      const artifactHashMatches = savedBundle ? savedBundle.artifactHash === newBundle.artifactHash : false;
      const vertexCountMatches = savedBundle ? savedBundle.renderVertexCount === renderMesh.vertexCount : false;
      const triangleCountMatches = savedBundle ? savedBundle.renderTriangleCount === renderMesh.triangleCount : false;
      const navPolygonCountMatches = savedBundle ? savedBundle.navigationPolygonCount === navigation.polygonCount : false;
      const vegInstanceCountMatches = savedBundle ? savedBundle.vegetationInstanceCount === vegetation.instanceCount : false;

      const allMatch = recipeHashMatches && artifactHashMatches && vertexCountMatches && triangleCountMatches && navPolygonCountMatches && vegInstanceCountMatches;

      return NextResponse.json({
        ok: true,
        action: 'reload-and-verify',
        graphId,
        savedBundle,
        reevaluatedBundle: {
          recipeHash: newBundle.recipeHash,
          artifactHash: newBundle.artifactHash,
          renderVertexCount: renderMesh.vertexCount,
          renderTriangleCount: renderMesh.triangleCount,
          navigationPolygonCount: navigation.polygonCount,
          vegetationInstanceCount: vegetation.instanceCount,
        },
        verification: {
          recipeHashMatches,
          artifactHashMatches,
          vertexCountMatches,
          triangleCountMatches,
          navPolygonCountMatches,
          vegInstanceCountMatches,
          allMatch,
        },
        message: allMatch
          ? 'DURABLE PERSISTENCE VERIFIED: saved and reloaded artifact hashes match'
          : 'MISMATCH: saved and reloaded artifacts differ',
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
