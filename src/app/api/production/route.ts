import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import {
  MALE_BASE_SCALE, FEMALE_BASE_SCALE,
  EQUIPMENT_SLOTS, ALL_BODY_HIDE_ZONES, ALL_SOCKETS,
  TRIANGLE_BUDGETS, MATERIAL_SPECS,
} from '@/engine/production/character-factory';
import { BIOME_KITS } from '@/engine/production/terrain-factory';
import { REQUIRED_STRUCTURE_KITS, SCALE_STANDARD, ALL_DAMAGE_STATES } from '@/engine/production/structure-factory';
import { HUD_ELEMENTS, TECHNIQUE_WHEEL_CATEGORIES, TYPOGRAPHY, UI_VISUAL_LANGUAGE } from '@/engine/production/ui-system';
import {
  WORLD_SCALE, TRAVERSAL_MODES, STREAMING_TIERS,
  PERFORMANCE_BUDGETS, NAMING_CONVENTION, FPS_TARGET,
} from '@/engine/production/streaming-optimization';
import { validateAssetId } from '@/engine/production/naming-validator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/production
 *   Returns all production factory types and specifications.
 *
 * POST /api/production
 *   Validates an asset ID against the naming convention.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  return NextResponse.json({
    character: {
      maleScale: MALE_BASE_SCALE,
      femaleScale: FEMALE_BASE_SCALE,
      equipmentSlots: EQUIPMENT_SLOTS.length,
      bodyHideZones: ALL_BODY_HIDE_ZONES.length,
      sockets: ALL_SOCKETS.length,
      triangleBudgets: TRIANGLE_BUDGETS,
      materialSpecs: Object.keys(MATERIAL_SPECS).length,
    },
    terrain: {
      biomeKits: BIOME_KITS.length,
      biomes: BIOME_KITS.map((b) => ({ id: b.biomeId, name: b.name })),
    },
    structures: {
      requiredKits: REQUIRED_STRUCTURE_KITS.length,
      damageStates: ALL_DAMAGE_STATES.length,
      gridM: 0.5,
      scaleStandard: SCALE_STANDARD,
    },
    ui: {
      hudElements: HUD_ELEMENTS.length,
      techniqueCategories: TECHNIQUE_WHEEL_CATEGORIES.length,
      typography: TYPOGRAPHY,
      visualLanguage: UI_VISUAL_LANGUAGE,
    },
    streaming: {
      worldScaleEntries: WORLD_SCALE.length,
      traversalModes: TRAVERSAL_MODES.length,
      streamingTiers: STREAMING_TIERS.length,
      performanceBudgets: PERFORMANCE_BUDGETS.length,
      fpsTarget: FPS_TARGET,
      namingConvention: NAMING_CONVENTION,
    },
    summary: {
      totalSpecs: 'character + terrain + structure + UI + streaming + gauntlet',
      bibleLines: 1643,
      biblePath: 'docs/production-bible.md',
    },
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { assetId } = body as { assetId: string };

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
    }

    const result = validateAssetId(assetId);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
