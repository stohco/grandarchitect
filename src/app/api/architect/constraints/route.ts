/**
 * POST /api/architect/constraints/solve
 *
 * Solves a constraint problem and returns the solution + proof object.
 *
 * Body: ConstraintProblem (variables, constraints, objective)
 * Returns: ConstraintSolution (ok, model?, proof, failureReason?)
 *
 * GET returns a sample constraint problem (sect layout).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRCVCService, sampleSectLayoutProblem } from '@/engine/architect/rcvc';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const problem = body.problem ?? body;

    if (!problem || !Array.isArray(problem.variables) || !Array.isArray(problem.constraints)) {
      return NextResponse.json(
        { error: 'Invalid constraint problem: requires "variables" and "constraints" arrays' },
        { status: 400 },
      );
    }

    const service = createRCVCService();
    const solution = service.solveConstraints(problem);

    return NextResponse.json(solution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    problem: sampleSectLayoutProblem(),
    description: 'Sample sect layout constraint problem. POST this back to /api/architect/constraints/solve to get a solution + proof.',
  });
}
