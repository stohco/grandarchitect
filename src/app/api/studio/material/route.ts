import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { analyzeUVIslands, computeTexelDensity, detectUVSeams, getMaterialPreviewInfo } from '@/engine/studio/uv-material-editor';
import { createMeshKernel, addVertex, addFace } from '@/engine/studio/mesh-kernel';
import { autoUnwrap } from '@/engine/studio/mesh-operations';
import type { MeshKernel } from '@/engine/studio/mesh-kernel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory mesh store for UV/material analysis
const meshes = new Map<string, MeshKernel>();

function getOrCreateTestMesh(assetId: string): MeshKernel {
  if (meshes.has(assetId)) return meshes.get(assetId)!;
  const kernel = createMeshKernel(assetId, 'Test Mesh');
  // Create a simple box
  const v = [
    addVertex(kernel, [-0.5, 0, -0.5]),
    addVertex(kernel, [0.5, 0, -0.5]),
    addVertex(kernel, [0.5, 1, -0.5]),
    addVertex(kernel, [-0.5, 1, -0.5]),
    addVertex(kernel, [-0.5, 0, 0.5]),
    addVertex(kernel, [0.5, 0, 0.5]),
    addVertex(kernel, [0.5, 1, 0.5]),
    addVertex(kernel, [-0.5, 1, 0.5]),
  ];
  addFace(kernel, [v[0], v[1], v[2], v[3]]);
  addFace(kernel, [v[5], v[4], v[7], v[6]]);
  addFace(kernel, [v[4], v[0], v[3], v[7]]);
  addFace(kernel, [v[1], v[5], v[6], v[2]]);
  addFace(kernel, [v[3], v[2], v[6], v[7]]);
  addFace(kernel, [v[4], v[5], v[1], v[0]]);
  // Generate UVs
  autoUnwrap(kernel, { mode: 'box', uvSetIndex: 0 });
  meshes.set(assetId, kernel);
  return kernel;
}

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  return NextResponse.json({
    meshes: Array.from(meshes.keys()).map((id) => ({
      assetId: id,
      vertexCount: meshes.get(id)!.vertices.size,
      faceCount: meshes.get(id)!.faces.size,
      uvSetCount: meshes.get(id)!.uvSets.length,
    })),
    availableChannels: ['baseColor', 'normal', 'orm', 'emissive', 'dyeMask', 'detailMask', 'subsurfaceMask', 'damageMask'],
    availableProjections: ['planar', 'box', 'cylindrical', 'spherical'],
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, assetId, params } = body as {
      action: string;
      assetId?: string;
      params?: Record<string, unknown>;
    };

    const id = assetId ?? 'TEST_UV_MESH';

    switch (action) {
      case 'analyze_islands': {
        const kernel = getOrCreateTestMesh(id);
        if (kernel.uvSets.length === 0) {
          return NextResponse.json({ error: 'No UV sets' }, { status: 400 });
        }
        const islands = analyzeUVIslands(kernel.uvSets[0]);
        return NextResponse.json({
          ok: true,
          assetId: id,
          islandCount: islands.length,
          islands: islands.map((i) => ({
            islandId: i.islandId,
            uvCount: i.uvIndices.length,
            bounds: i.bounds,
            area: i.area,
          })),
        });
      }

      case 'texel_density': {
        const kernel = getOrCreateTestMesh(id);
        const textureRes = (params?.textureResolution as number) ?? 2048;
        const targetRange = (params?.targetRange as [number, number]) ?? [256, 768];
        const result = computeTexelDensity(kernel, 0, textureRes, targetRange);
        return NextResponse.json({
          ok: true,
          assetId: id,
          texelDensity: result,
        });
      }

      case 'detect_seams': {
        const kernel = getOrCreateTestMesh(id);
        const seams = detectUVSeams(kernel, 0);
        return NextResponse.json({
          ok: true,
          assetId: id,
          seamCount: seams.length,
          totalLength: seams.reduce((s, seam) => s + seam.length3D, 0),
          seams: seams.slice(0, 20).map((s) => ({
            seamId: s.seamId,
            length3D: s.length3D,
          })),
        });
      }

      case 'preview_info': {
        const kernel = getOrCreateTestMesh(id);
        const textureRes = (params?.textureResolution as number) ?? 2048;
        const info = getMaterialPreviewInfo(kernel, 0, textureRes);
        return NextResponse.json({
          ok: true,
          assetId: id,
          previewInfo: info,
        });
      }

      case 'unwrap': {
        const kernel = getOrCreateTestMesh(id);
        const mode = (params?.mode as string) ?? 'box';
        autoUnwrap(kernel, { mode: mode as 'planar' | 'box' | 'cylindrical' | 'spherical', uvSetIndex: 0 });
        const info = getMaterialPreviewInfo(kernel, 0, 2048);
        return NextResponse.json({
          ok: true,
          assetId: id,
          mode,
          previewInfo: info,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
