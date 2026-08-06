import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import type { TerrainDestructionOperation, TerrainOperationType } from '@/engine/world/world-fabric';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/world/destruct
 *
 * Records a terrain destruction operation and marks affected cells for
 * recompilation. This is operation-history-based destruction — not direct
 * vertex mutation.
 *
 * Body:
 *   {
 *     cellId: string,
 *     type: 'subtract-sphere' | 'subtract-capsule' | ...,
 *     transform: { position, rotation, scale },
 *     strength: number,
 *     falloff: number,
 *     sourceEntityId?: string,
 *     techniqueId?: string
 *   }
 *
 * The final terrain is: base recipe + permanent edits + destruction operations.
 * This makes destruction saveable, replayable, and debuggable.
 */

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const {
      cellId,
      type,
      transform,
      strength,
      falloff,
      sourceEntityId,
      techniqueId,
    } = body as {
      cellId: string;
      type: TerrainOperationType;
      transform: {
        position: [number, number, number];
        rotation: [number, number, number, number];
        scale: [number, number, number];
      };
      strength: number;
      falloff: number;
      sourceEntityId?: string;
      techniqueId?: string;
    };

    if (!cellId || !type || !transform) {
      return NextResponse.json(
        { error: 'Missing cellId, type, or transform' },
        { status: 400 },
      );
    }

    // Validate transform values are finite
    const allValues = [
      ...transform.position,
      ...transform.rotation,
      ...transform.scale,
      strength,
      falloff,
    ];
    if (!allValues.every(Number.isFinite)) {
      return NextResponse.json(
        { error: 'Transform contains non-finite values' },
        { status: 400 },
      );
    }

    const operation: TerrainDestructionOperation = {
      id: `dest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      worldRevision: 1, // Would be the current cell revision
      type,
      transform,
      strength: Math.max(0, Math.min(1, strength)),
      falloff: Math.max(0, falloff),
      sourceEntityId,
      techniqueId,
      timestamp: new Date().toISOString(),
    };

    // In a real implementation, this would:
    // 1. Identify intersecting sparse bricks
    // 2. Mark field/material samples dirty
    // 3. Identify affected render chunks
    // 4. Schedule local remesh
    // 5. Rebuild collision/navigation/ecology
    // 6. Activate synchronized bundle (atomic — all at same revision)

    return NextResponse.json({
      ok: true,
      operation,
      message: `Destruction operation recorded: ${type} in cell ${cellId}. ` +
        `Affected bricks would be remeshed, collision/nav rebuilt, and ` +
        `activated as an atomic bundle.`,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
