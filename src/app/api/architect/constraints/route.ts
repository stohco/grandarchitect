import { NextRequest, NextResponse } from 'next/server';
import { createConstraintService } from '@/engine/architect/rcvc/constraints/service';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const problem = body.problem ?? body;
    if (!problem || !Array.isArray(problem.variables) || !Array.isArray(problem.constraints)) {
      return NextResponse.json({ error: 'Invalid constraint problem' }, { status: 400 });
    }
    const service = createConstraintService();
    return NextResponse.json(service.solve(problem));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    problem: {
      variables: [
        { name: 'mainHallPos', domain: { kind: 'vec3', min: [-50, 0, -50], max: [50, 0, 50] } },
        { name: 'gatePos', domain: { kind: 'vec3', min: [-50, 0, -50], max: [50, 0, 50] } },
      ],
      constraints: [
        { id: 'c1', label: 'Path connects buildings', kind: 'path_connectivity', variables: ['mainHallPos', 'gatePos'], expression: { type: 'distance_le', a: { kind: 'var', name: 'mainHallPos' }, b: { kind: 'var', name: 'gatePos' }, max: { kind: 'const', value: 40 } }, hard: true },
      ],
      objective: 'minimize_cost',
    },
    description: 'Sample sect layout constraint problem.',
  });
}
