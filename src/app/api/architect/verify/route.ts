import { NextResponse } from 'next/server';
import { ALL_PROTOCOLS } from '@/engine/architect/rcvc/verification/protocols';
import { modelCheckAll } from '@/engine/architect/rcvc/verification/model-checker';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const results = modelCheckAll(ALL_PROTOCOLS);
    const allPass = results.every(r => r.passes);
    return NextResponse.json({
      results,
      overallVerdict: allPass ? 'all_pass' : 'violations_found',
      protocolCount: results.length,
      totalReachableStates: results.reduce((s, r) => s + r.reachableStates.length, 0),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
