import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getCoordinator } from '@/engine/world/derived-artifact-coordinator';
import type { WorldCell, TerrainLayer, SimulationTier } from '@/engine/world/world-fabric';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/world/fabric
 *   Returns the World Fabric coordinator state and cell summaries.
 *
 * POST /api/world/fabric
 *   Creates or updates a world cell.
 */

// In-memory cell registry (would be persistent in production)
const cells = new Map<string, WorldCell>();

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const coordinator = getCoordinator();
  const summary = coordinator.getSummary();

  const cellSummaries = Array.from(cells.values()).map((c) => ({
    cellId: c.cellId,
    revision: c.revision,
    activeLayers: c.activeLayers,
    bounds: c.bounds,
    simulationTier: c.simulation.tier,
    active: c.ecology.active,
    destructionCount: c.destructionLog.length,
    derivedArtifacts: c.derived.render.length + c.derived.collision.length + c.derived.navigation.length,
  }));

  return NextResponse.json({
    cells: cellSummaries,
    coordinator: summary,
    summary: {
      totalCells: cells.size,
      activeCells: cellSummaries.filter((c) => c.active).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { action, cellId, layers, bounds } = body as {
      action: 'create' | 'invalidate' | 'activate';
      cellId: string;
      layers?: TerrainLayer[];
      bounds?: { min: [number, number, number]; max: [number, number, number] };
    };

    if (!action || !cellId) {
      return NextResponse.json(
        { error: 'Missing action or cellId' },
        { status: 400 },
      );
    }

    const coordinator = getCoordinator();

    if (action === 'create') {
      const cell: WorldCell = {
        cellId,
        revision: 1,
        bounds: bounds ?? { min: [0, 0, 0], max: [128, 64, 128] },
        activeLayers: layers ?? ['surface-mesh'],
        baseTerrain: {
          recipeHash: 'seed-recipe-' + cellId,
          seed: 42,
          type: 'mountain',
          parameters: {},
        },
        volumetricRegions: [],
        placedAssets: [],
        structures: [],
        ecology: {
          tier: 'tier-2-regional' as SimulationTier,
          active: false,
          npcCount: 0,
          vegetationDensity: 0.5,
          lastTick: 0,
        },
        simulation: {
          tier: 'tier-2-regional' as SimulationTier,
          activeDomains: [],
          simulationLOD: 2,
          renderDecoupled: true,
        },
        destructionLog: [],
        derived: {
          render: [],
          collision: [],
          navigation: [],
          vegetation: [],
          audio: [],
          streaming: [],
        },
      };
      cells.set(cellId, cell);
      return NextResponse.json({ ok: true, cell });
    }

    if (action === 'invalidate') {
      const cell = cells.get(cellId);
      if (!cell) {
        return NextResponse.json({ error: 'Cell not found' }, { status: 404 });
      }
      coordinator.invalidateCell(cellId, ['render-mesh', 'collision-mesh', 'navigation-mesh']);
      return NextResponse.json({ ok: true, invalidated: true });
    }

    if (action === 'activate') {
      const activated = coordinator.activateBundle(cellId);
      return NextResponse.json({ ok: true, activated });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
