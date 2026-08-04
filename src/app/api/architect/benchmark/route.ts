import { NextResponse } from 'next/server';
import { runBenchmarkSuite } from '@/engine/architect/rcvc/perf/benchmarks';
export const runtime = 'nodejs';

export async function POST() {
  try { return NextResponse.json(runBenchmarkSuite()); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 }); }
}

export async function GET() {
  return NextResponse.json({
    ursusTargets: { 'Spawn 10k': 10.0, 'FindAll 10k': 1.1, 'Disable 10k': 1.0, 'Enable 10k': 0.5, 'GetComponent 10k': 0.1 },
    entityCount: 10000, note: 'POST to run the benchmark suite.',
  });
}
