/**
 * GET /api/architect/verify
 *
 * Runs the model checker on all built-in protocols and returns the results.
 *
 * Returns: { results: ModelCheckResult[], overallVerdict }
 */

import { NextResponse } from 'next/server';
import { verifyAllProtocols } from '@/engine/architect/rcvc';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const results = verifyAllProtocols();
    const overallVerdict = results.every(r => r.verdict === 'all_pass')
      ? 'all_pass'
      : 'violations_found';

    return NextResponse.json({
      results,
      overallVerdict,
      protocolCount: results.length,
      totalTracesExplored: results.reduce((sum, r) => sum + r.tracesExplored, 0),
      totalStatesExplored: results.reduce((sum, r) => sum + r.statesExplored, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
