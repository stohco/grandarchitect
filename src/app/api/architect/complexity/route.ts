/**
 * GET /api/architect/complexity?scale=settlement&window=years&seed=42
 *
 * Samples world-state complexity at the given scale, time window, and seed.
 * Returns a ComplexityReport with compressibility, diversity, light-cone MI,
 * and trend diagnosis.
 *
 * Query params:
 *   scale: npc | settlement | region | planet | realm | multiverse (default: settlement)
 *   window: minutes | days | years | centuries | generations (default: years)
 *   seed: integer (default: 42)
 *   sampleCount: integer (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRCVCService } from '@/engine/architect/rcvc';
import type { SpatialScale, TimeWindow } from '@/engine/architect/rcvc';

export const runtime = 'nodejs';

const VALID_SCALES = new Set(['npc', 'settlement', 'region', 'planet', 'realm', 'multiverse']);
const VALID_WINDOWS = new Set(['minutes', 'days', 'years', 'centuries', 'generations']);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scale = (searchParams.get('scale') ?? 'settlement') as SpatialScale;
    const window = (searchParams.get('window') ?? 'years') as TimeWindow;
    const seedStr = searchParams.get('seed') ?? '42';
    const sampleCount = parseInt(searchParams.get('sampleCount') ?? '20', 10);

    if (!VALID_SCALES.has(scale)) {
      return NextResponse.json({ error: `Invalid scale. Valid: ${Array.from(VALID_SCALES).join(', ')}` }, { status: 400 });
    }
    if (!VALID_WINDOWS.has(window)) {
      return NextResponse.json({ error: `Invalid window. Valid: ${Array.from(VALID_WINDOWS).join(', ')}` }, { status: 400 });
    }

    const service = createRCVCService();
    const report = service.sampleComplexity(scale, window, seedStr);

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
