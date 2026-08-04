import { NextResponse } from 'next/server';
import { ALL_PROTOCOLS } from '@/engine/architect/rcvc/verification/protocols';
import { modelCheck } from '@/engine/architect/rcvc/verification/model-checker';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const results = ALL_PROTOCOLS.map(spec => modelCheck(spec));
    const overallVerdict = results.every(r => r.verdict === 'all_pass') ? 'all_pass' : 'violations_found';
    return NextResponse.json({
      results, overallVerdict, protocolCount: results.length,
      totalTracesExplored: results.reduce((s, r) => s + r.tracesExplored, 0),
      totalStatesExplored: results.reduce((s, r) => s + r.statesExplored, 0),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
