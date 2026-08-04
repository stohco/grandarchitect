/**
 * GET /api/editor/world?seed=...&households=...&paddies=...
 *
 * Generates a deterministic settlement from a seed using the engine's
 * ga:gen-settlement generator and returns a JSON-serializable layout.
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateSettlement } from '@/engine/plugins/simulation/ga-gen-settlement';
import type { SerializableSettlement, SerializableStructure } from '@/lib/editor/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serialize(layout: ReturnType<typeof generateSettlement>): SerializableSettlement {
  const structures: SerializableStructure[] = layout.structures.map((s) => ({
    entityId: Number(s.entityId),
    kind: s.kind,
    name: s.name,
    nameHanzi: s.nameHanzi,
    position: { x: s.position.x, z: s.position.z },
    rotation: s.rotation,
    width: s.width,
    depth: s.depth,
    metadata: s.metadata as Record<string, unknown>,
  }));
  return {
    villageName: layout.villageName,
    villageNameHanzi: layout.villageNameHanzi,
    seed: layout.seed,
    tick: layout.tick,
    population: layout.population,
    householdCount: layout.householdCount,
    structures,
    households: layout.households,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const seed = sp.get('seed') || 'wang-family-bend-1108';
  const households = sp.get('households') ? parseInt(sp.get('households')!, 10) : undefined;
  const paddies = sp.get('paddies') ? parseInt(sp.get('paddies')!, 10) : undefined;

  try {
    const layout = generateSettlement({
      seed,
      householdCount: households,
      paddyCount: paddies,
    });
    const payload = serialize(layout);
    return NextResponse.json({
      ok: true,
      settlement: payload,
      stats: {
        structures: payload.structures.length,
        households: payload.households.length,
        population: payload.population,
        byKind: payload.structures.reduce<Record<string, number>>((acc, s) => {
          acc[s.kind] = (acc[s.kind] ?? 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
