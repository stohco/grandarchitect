/**
 * GET /api/architect/validate-bible
 *
 * Runs the contradiction detector across the entire corpus-extension/ bible.
 * Returns a structured report of contradictions and missing truth-level
 * annotations.
 *
 * The Grand Architect uses this to ensure the bible is internally consistent
 * before generating content from it.
 */

import { NextResponse } from 'next/server';
import { detectContradictions, formatReport } from '@/engine/architect/rcvc/verification/contradiction-detector';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const report = await detectContradictions();
    return NextResponse.json({
      ...report,
      formatted: formatReport(report),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
