/**
 * POST /api/architect/benchmark
 *
 * Runs the Ursus-comparison benchmark suite.
 * Returns BenchmarkSuite with results for spawn, findAll, disable, enable, GetComponent.
 *
 * No body required.
 */

import { NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { createRCVCService } from '@/engine/architect/rcvc';

export const runtime = 'nodejs';

export async function POST() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;
  try {
    const service = createRCVCService();
    const suite = service.runBenchmarks();
    return NextResponse.json(suite);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  // Return the Ursus targets for reference
  return NextResponse.json({
    ursusTargets: {
      'Spawn 10,000 animated characters': 10.0,
      'FindAll<T> [10k]': 1.1,
      '10k × Disable game object': 1.0,
      '10k × Enable game object': 0.5,
      '10k × GetComponent<T>': 0.1,
    },
    unityBaselines: {
      'Spawn 10,000 animated characters': 691.0,
      'FindAll<T> [10k]': 1.1,
      '10k × Disable game object': 76.2,
      '10k × Enable game object': 213.8,
      '10k × GetComponent<T>': 4.0,
    },
    entityCount: 10000,
    note: 'POST to run the benchmark suite against our entity pool.',
  });
}
