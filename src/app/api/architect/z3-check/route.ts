/**
 * GET /api/architect/z3-check
 * ----------------------------------
 * Tests Z3 WASM initialization and runs the 7 canonical xianxia invariants.
 *
 * Per the FRONTIER_TECHNOLOGY_MATRIX.md directive, Z3 is the SMT theorem
 * prover that enforces hard invariants like:
 *   - Entity revision exists
 *   - Matching revisions activate together
 *   - Mortal cannot void-survive
 *   - No stale commit
 *
 * This endpoint proves the Z3 adapter actually initializes and can solve
 * a real SMT formula.
 */

import { NextResponse } from 'next/server';
import { getZ3Solver, CANONICAL_INVARIANTS } from '@/engine/architect/z3-verifier';
import { getPlanningRouter } from '@/engine/architect/planning-router/types';
import type { PlanningProblem } from '@/engine/architect/planning-router/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const z3 = getZ3Solver();
    await z3.ensureInitialized();

    if (!z3.available) {
      return NextResponse.json({
        ok: false,
        available: false,
        reason: z3.reason,
        invariants: CANONICAL_INVARIANTS.length,
      });
    }

    // Build a test problem with the 7 canonical invariants.
    const problem: PlanningProblem = {
      problemId: `z3-test-${Date.now().toString(36)}`,
      type: 'hard-law-check',
      description: 'Test Z3 with canonical xianxia invariants',
      invariants: CANONICAL_INVARIANTS,
    };

    // Register Z3 in the router and solve.
    const router = getPlanningRouter();
    router.registerSolver(z3);
    const result = await router.solve(problem);

    return NextResponse.json({
      ok: true,
      available: z3.available,
      reason: z3.reason,
      invariantsChecked: CANONICAL_INVARIANTS.length,
      result: {
        planId: result.planId,
        valid: result.valid,
        solverUsed: result.solverUsed,
        solveTimeMs: result.solveTimeMs,
        explanation: result.explanation,
        invariantResults: result.invariantResults,
      },
      canonicalInvariants: CANONICAL_INVARIANTS.map((inv) => ({
        invariantId: inv.invariantId,
        name: inv.name,
        description: inv.description,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message,
      stack: (err as Error).stack,
    }, { status: 500 });
  }
}
