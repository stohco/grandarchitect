import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { createOperationStack, addOperation, evaluateStack, serializeStack } from '@/engine/studio/operation-stack';
import { toBufferGeometry, getMeshStats } from '@/engine/studio/mesh-kernel';
import type { OperationType } from '@/engine/studio/operation-stack';
import { generateStructure, defaultSectHallParams, defaultCottageParams } from '@/engine/studio/structure-grammar';
import type { StructureGrammarParams } from '@/engine/studio/structure-grammar';
import { projectUVs } from '@/engine/studio/mesh-operations';
import { exportToGLB } from '@/engine/studio/glb-export';
import { generateCompleteCharacter } from '@/engine/studio/character-authoring';
import { createDensityField, initializeMountainField, applyBrush, carveTunnel, extractSurface, getFieldStats } from '@/engine/studio/voxel-terrain-studio';
import type { BrushType } from '@/engine/studio/voxel-terrain-studio';
import { placeAssetInWorld, getStudioRuntimeStatus } from '@/engine/studio/studio-runtime-bridge';
import { getEngineRuntime } from '@/engine/runtime/engine-runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/studio
 *   Returns the Live Studio modeling kernel + operation stack info.
 *
 * POST /api/studio
 *   Creates an asset from an operation stack and returns the evaluated mesh.
 *
 * The Live Studio IS the asset authoring environment — not a viewer for
 * Blender exports. Three.js meshes are DERIVED from the authoritative
 * MeshKernel, which is built from inspectable, deterministic operations.
 */

// In-memory stacks
const stacks = new Map<string, ReturnType<typeof createOperationStack>>();

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const stackInfos = Array.from(stacks.entries()).map(([id, stack]) => {
    const kernel = evaluateStack(stack);
    const stats = getMeshStats(kernel);
    return {
      assetId: id,
      operationCount: stack.operations.length,
      dirty: stack.dirty,
      meshStats: stats,
    };
  });

  return NextResponse.json({
    architecture: 'Live Studio = Blender-replacement (not a Blender viewer)',
    pipeline: 'GLM writes operations → Live Studio evaluates → MeshKernel → Three.js renders',
    stacks: stackInfos,
    availableOperations: [
      'create_box', 'create_cylinder', 'create_sphere', 'create_capsule', 'create_plane',
      'extrude', 'inset', 'bevel', 'bridge_loops', 'loop_cut', 'knife_cut',
      'merge_weld', 'separate', 'mirror', 'array', 'radial_array',
      'sweep_profile', 'loft_profiles', 'boolean_union', 'boolean_subtract', 'boolean_intersect',
      'solidify', 'smooth', 'relax', 'remesh', 'decimate', 'subdivide',
      'shrinkwrap', 'conform_to_body', 'conform_to_terrain',
      'create_garment_shell', 'split_panels', 'shape_silhouette',
      'add_thickness', 'add_trim', 'assign_cloth_regions',
      'assign_hide_zones', 'assign_sockets', 'transfer_skin_weights',
      'create_foundation', 'create_bay_grid', 'create_roof', 'create_column', 'create_beam',
      'density_brush', 'smooth_brush', 'flatten', 'carve_tunnel', 'paint_material',
      'generate_normals', 'generate_collision_proxy', 'generate_lod', 'bake_result',
    ],
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, assetId, operations } = body as {
      action: 'create' | 'evaluate' | 'serialize';
      assetId: string;
      operations?: Array<{ op: OperationType; params?: Record<string, unknown> }>;
    };

    if (!action || !assetId) {
      return NextResponse.json({ error: 'Missing action or assetId' }, { status: 400 });
    }

    if (action === 'create') {
      if (!operations) {
        return NextResponse.json({ error: 'Missing operations array' }, { status: 400 });
      }

      const stack = createOperationStack(assetId);
      for (const op of operations) {
        addOperation(stack, {
          op: op.op,
          params: op.params ?? {},
          enabled: true,
        });
      }
      stacks.set(assetId, stack);

      // Evaluate
      const kernel = evaluateStack(stack);
      const buffer = toBufferGeometry(kernel);
      const stats = getMeshStats(kernel);
      const serialized = serializeStack(stack);

      return NextResponse.json({
        ok: true,
        assetId,
        operationCount: stack.operations.length,
        meshStats: stats,
        serialized,
        buffer: {
          vertexCount: buffer.positions.length / 3,
          triangleCount: buffer.indices.length / 3,
          hasNormals: buffer.normals.length > 0,
          hasUVs: buffer.uvs !== null,
          hasSkinWeights: buffer.skinWeights !== undefined,
          groupCount: buffer.groups.length,
        },
      });
    }

    if (action === 'evaluate') {
      const stack = stacks.get(assetId);
      if (!stack) {
        return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
      }
      const kernel = evaluateStack(stack);
      const stats = getMeshStats(kernel);
      return NextResponse.json({ ok: true, meshStats: stats });
    }

    if (action === 'serialize') {
      const stack = stacks.get(assetId);
      if (!stack) {
        return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, serialized: serializeStack(stack) });
    }

    if (action === 'generate_structure') {
      const params = body.params as StructureGrammarParams;
      if (!params) {
        return NextResponse.json({ error: 'Missing structure params' }, { status: 400 });
      }
      const kernel = generateStructure(params);
      const buffer = toBufferGeometry(kernel);
      const stats = getMeshStats(kernel);
      return NextResponse.json({
        ok: true,
        assetId: params.assetId,
        meshStats: stats,
        buffer: {
          vertexCount: buffer.positions.length / 3,
          triangleCount: buffer.indices.length / 3,
          hasNormals: buffer.normals.length > 0,
          hasUVs: buffer.uvs !== null,
          groupCount: buffer.groups.length,
        },
        tags: kernel.tags,
      });
    }

    if (action === 'default_sect_hall') {
      const params = defaultSectHallParams(assetId);
      const kernel = generateStructure(params);
      const stats = getMeshStats(kernel);
      return NextResponse.json({
        ok: true,
        assetId,
        params,
        meshStats: stats,
        tags: kernel.tags,
      });
    }

    if (action === 'default_cottage') {
      const params = defaultCottageParams(assetId);
      const kernel = generateStructure(params);
      const stats = getMeshStats(kernel);
      return NextResponse.json({
        ok: true,
        assetId,
        params,
        meshStats: stats,
        tags: kernel.tags,
      });
    }

    if (action === 'auto_unwrap') {
      const stack = stacks.get(assetId);
      if (!stack) {
        return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
      }
      const kernel = evaluateStack(stack);
      const mode = (body.params?.mode as string) ?? 'box';
      projectUVs(kernel, { mode: mode as 'planar' | 'box' | 'cylindrical' | 'spherical', uvSetIndex: 0 });
      const stats = getMeshStats(kernel);
      return NextResponse.json({
        ok: true,
        assetId,
        meshStats: stats,
        uvSetCount: kernel.uvSets.length,
        uvCoordCount: kernel.uvSets[0]?.coords.length ?? 0,
      });
    }

    if (action === 'export_glb') {
      const stack = stacks.get(assetId);
      if (!stack) {
        return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
      }
      const kernel = evaluateStack(stack);
      const glb = exportToGLB(kernel);
      return NextResponse.json({
        ok: true,
        assetId,
        glb: {
          sizeBytes: glb.sizeBytes,
          vertexCount: glb.vertexCount,
          triangleCount: glb.triangleCount,
          materialCount: glb.materialCount,
          hash: glb.hash,
        },
      });
    }

    if (action === 'generate_character') {
      const gender = (body.params?.gender as 'male' | 'female') ?? 'male';
      const result = generateCompleteCharacter(assetId, gender);
      return NextResponse.json({
        ok: true,
        assetId,
        body: getMeshStats(result.body),
        innerTorso: getMeshStats(result.innerTorso),
        innerLegs: getMeshStats(result.innerLegs),
        boots: getMeshStats(result.boots),
        assembly: result.assembly,
      });
    }

    if (action === 'terrain_create') {
      const bounds = body.params?.bounds ?? { min: [0, 0, 0], max: [64, 32, 64] };
      const resolution = (body.params?.resolution as number) ?? 2;
      const field = createDensityField(assetId, bounds, resolution);
      return NextResponse.json({
        ok: true,
        fieldId: field.fieldId,
        dimensions: field.dimensions,
        totalVoxels: field.data.length,
        revision: field.revision,
      });
    }

    if (action === 'terrain_mountain') {
      const bounds = body.params?.bounds ?? { min: [0, 0, 0], max: [64, 32, 64] };
      const resolution = (body.params?.resolution as number) ?? 2;
      const peakHeight = (body.params?.peakHeight as number) ?? 25;
      const field = createDensityField(assetId, bounds, resolution);
      initializeMountainField(field, peakHeight, [32, 0, 32], 30);
      const stats = getFieldStats(field);
      return NextResponse.json({
        ok: true,
        fieldId: field.fieldId,
        dimensions: field.dimensions,
        revision: field.revision,
        stats,
      });
    }

    if (action === 'terrain_brush') {
      // This is a simplified demo — in production, the field would be stored
      const bounds = body.params?.bounds ?? { min: [0, 0, 0], max: [64, 32, 64] };
      const resolution = (body.params?.resolution as number) ?? 2;
      const peakHeight = (body.params?.peakHeight as number) ?? 25;
      const field = createDensityField(assetId, bounds, resolution);
      initializeMountainField(field, peakHeight, [32, 0, 32], 30);

      const brushType = (body.params?.brushType as BrushType) ?? 'subtract';
      const center = body.params?.center ?? [32, 15, 32];
      const radiusM = (body.params?.radiusM as number) ?? 5;
      const strength = (body.params?.strength as number) ?? 0.5;

      const result = applyBrush(field, {
        type: brushType,
        center: center as [number, number, number],
        radiusM,
        strength,
        materialId: body.params?.materialId as number | undefined,
        targetHeight: body.params?.targetHeight as number | undefined,
      });

      const stats = getFieldStats(field);
      return NextResponse.json({
        ok: true,
        fieldId: field.fieldId,
        brushResult: result,
        stats,
        revision: field.revision,
      });
    }

    if (action === 'terrain_tunnel') {
      const bounds = body.params?.bounds ?? { min: [0, 0, 0], max: [64, 32, 64] };
      const resolution = (body.params?.resolution as number) ?? 2;
      const peakHeight = (body.params?.peakHeight as number) ?? 25;
      const field = createDensityField(assetId, bounds, resolution);
      initializeMountainField(field, peakHeight, [32, 0, 32], 30);

      const start = body.params?.start ?? [0, 15, 32];
      const end = body.params?.end ?? [64, 15, 32];
      const radiusM = (body.params?.radiusM as number) ?? 3;

      const result = carveTunnel(field, {
        start: start as [number, number, number],
        end: end as [number, number, number],
        radiusM,
      });

      const stats = getFieldStats(field);
      return NextResponse.json({
        ok: true,
        fieldId: field.fieldId,
        tunnelResult: result,
        stats,
        revision: field.revision,
      });
    }

    if (action === 'terrain_extract') {
      const bounds = body.params?.bounds ?? { min: [0, 0, 0], max: [64, 32, 64] };
      const resolution = (body.params?.resolution as number) ?? 2;
      const peakHeight = (body.params?.peakHeight as number) ?? 25;
      const field = createDensityField(assetId, bounds, resolution);
      initializeMountainField(field, peakHeight, [32, 0, 32], 30);

      const mesh = extractSurface(field);
      return NextResponse.json({
        ok: true,
        fieldId: field.fieldId,
        extractedMesh: {
          vertexCount: mesh.vertexCount,
          triangleCount: mesh.triangleCount,
          sourceRevision: mesh.sourceRevision,
        },
      });
    }

    if (action === 'place_in_world') {
      const stack = stacks.get(assetId);
      if (!stack) {
        return NextResponse.json({ error: 'Stack not found' }, { status: 404 });
      }
      const kernel = evaluateStack(stack);
      const runtime = getEngineRuntime();
      const session = runtime.gateway.authenticate({
        principalId: (body.params?.principalId as string) ?? 'studio-user',
        token: 'dev-token',
      });
      if (!session) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 403 });
      }
      const cellId = (body.params?.cellId as string) ?? assetId;
      const position = (body.params?.position as [number, number, number]) ?? [0, 0, 0];
      const result = await placeAssetInWorld(kernel, session, cellId, position);
      return NextResponse.json({ ok: result.success, result });
    }

    if (action === 'runtime_status') {
      const status = getStudioRuntimeStatus();
      return NextResponse.json({ ok: true, status });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
