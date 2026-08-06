import { NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { scanUiSurfaces } from '@/lib/studio-ui/surface-inventory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/studio-ui/inventory
 *
 * Programmatically inventories every interactive surface in the repository.
 * Scans source files for buttons, tabs, links, inputs, selects, shortcuts.
 * Classifies each by status (working, broken, no-op, placeholder, etc.)
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const result = scanUiSurfaces(process.cwd());

  return NextResponse.json({
    surfaces: result.surfaces,
    stats: result.stats,
    summary: {
      totalSurfaces: result.stats.total,
      byStatus: result.stats.byStatus,
      byType: result.stats.byType,
      noOpCount: result.stats.byStatus['no-op'],
      placeholderCount: result.stats.byStatus.placeholder,
      unknownCount: result.stats.byStatus.unknown,
      workingCount: result.stats.byStatus.working,
    },
  });
}
