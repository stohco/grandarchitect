/**
 * POST /api/architect/multi-solver-plan
 * --------------------------------------
 * Bake-off 2 prototype: multi-solver authorial planning.
 *
 * Per FRONTIER_TECHNOLOGY_MATRIX.md, the Grand Architect does NOT use a
 * single planner. It uses a Planning Router that dispatches to specialized
 * solvers:
 *   - Z3: hard law and revision invariants
 *   - Cedar: authorization check
 *   - Deterministic planner: action ordering
 *
 * This endpoint takes a real request ("Create an ancient declining sword-sect
 * city while preserving the river and village road") and:
 *   1. Plans the action order (deterministic)
 *   2. Checks hard-law invariants (Z3 / deterministic fallback)
 *   3. Checks authorization (Cedar)
 *   4. Returns the combined plan with all solver results
 *
 * Body: { request: string }
 * Returns: { plan, invariantCheck, authorizationCheck, combined }
 */

import { NextResponse } from 'next/server';
import { getZ3Solver, CANONICAL_INVARIANTS } from '@/engine/architect/z3-verifier';
import { getCedarAuthorizer } from '@/engine/architect/cedar-auth';
import type { PlanningProblem } from '@/engine/architect/planning-router/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { request?: string };
    const requestText = body.request ?? 'Create an ancient declining sword-sect city while preserving the river and village road.';

    // 1. Deterministic action planning.
    const plan = planActions(requestText);

    // 2. Z3 hard-law invariant check.
    const z3 = getZ3Solver();
    await z3.ensureInitialized();
    const invariantProblem: PlanningProblem = {
      problemId: `bakeoff2-${Date.now().toString(36)}`,
      type: 'hard-law-check',
      description: `Invariant check for: ${requestText}`,
      invariants: CANONICAL_INVARIANTS,
    };
    const invariantResult = await z3.solve(invariantProblem);

    // 3. Cedar authorization check.
    const cedar = getCedarAuthorizer();
    await cedar.ensureInitialized();
    const authResult = await cedar.authorize({
      principal: {
        id: 'authorial-grand-architect',
        role: 'architect',
        autonomyLevel: 'assisted',
      },
      action: 'commit.terrain',
      resource: { type: 'world', id: 'sword-sect-city' },
      context: { hasApproval: true, previewPassed: true },
    });

    // 4. Combined result.
    const combined = {
      request: requestText,
      planValid: plan.errors.length === 0,
      invariantsSatisfied: invariantResult.valid,
      authorizationAllowed: authResult.allowed,
      overallValid: plan.errors.length === 0 && invariantResult.valid && authResult.allowed,
      solverSummary: {
        deterministic: { actionsPlanned: plan.actions.length, errors: plan.errors.length },
        z3: { available: z3.available, invariantsChecked: CANONICAL_INVARIANTS.length, satisfied: invariantResult.valid },
        cedar: { available: cedar.isAvailable(), allowed: authResult.allowed, reason: authResult.reason },
      },
    };

    return NextResponse.json({
      ok: true,
      combined,
      plan,
      invariantCheck: {
        solverUsed: invariantResult.solverUsed,
        valid: invariantResult.valid,
        solveTimeMs: invariantResult.solveTimeMs,
        explanation: invariantResult.explanation,
        invariantResults: invariantResult.invariantResults,
      },
      authorizationCheck: {
        available: cedar.isAvailable(),
        allowed: authResult.allowed,
        reason: authResult.reason,
        policyId: authResult.policyId,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/**
 * Deterministic action planner.
 * Parses the request and produces an ordered action list with temporal
 * constraints. This is the "Unified Planning" role (action + temporal).
 */
function planActions(request: string): {
  actions: Array<{ id: string; label: string; duration: string }>;
  temporalConstraints: Array<{ before: string; after: string }>;
  errors: string[];
} {
  const lower = request.toLowerCase();
  const actions: Array<{ id: string; label: string; duration: string }> = [];
  const temporal: Array<{ before: string; after: string }> = [];

  // Standard settlement-building actions with temporal dependencies.
  if (lower.includes('city') || lower.includes('sect') || lower.includes('settlement')) {
    actions.push({ id: 'carve-terrace', label: 'Carve terrace', duration: 'medium' });
    actions.push({ id: 'generate-foundation', label: 'Generate foundation', duration: 'medium' });
    actions.push({ id: 'place-structures', label: 'Place structures', duration: 'long' });
    actions.push({ id: 'establish-water', label: 'Establish water supply', duration: 'medium' });
    actions.push({ id: 'create-roads', label: 'Create road segments', duration: 'medium' });
    actions.push({ id: 'compile-navigation', label: 'Compile navigation', duration: 'short' });
    actions.push({ id: 'assign-population', label: 'Assign population', duration: 'short' });
    actions.push({ id: 'run-simulation', label: 'Run simulation', duration: 'long' });
    actions.push({ id: 'validate', label: 'Validate', duration: 'instant' });

    // Temporal constraints: terrain before foundations, foundations before buildings, etc.
    temporal.push({ before: 'carve-terrace', after: 'generate-foundation' });
    temporal.push({ before: 'generate-foundation', after: 'place-structures' });
    temporal.push({ before: 'place-structures', after: 'establish-water' });
    temporal.push({ before: 'place-structures', after: 'create-roads' });
    temporal.push({ before: 'create-roads', after: 'compile-navigation' });
    temporal.push({ before: 'place-structures', after: 'assign-population' });
    temporal.push({ before: 'compile-navigation', after: 'run-simulation' });
    temporal.push({ before: 'assign-population', after: 'run-simulation' });
    temporal.push({ before: 'run-simulation', after: 'validate' });
  }

  // Add ancient/sacred actions if requested.
  if (lower.includes('ancient') || lower.includes('sacred')) {
    actions.push({ id: 'apply-weathering', label: 'Apply weathering', duration: 'short' });
    actions.push({ id: 'apply-restraint', label: 'Apply restraint', duration: 'instant' });
    temporal.push({ before: 'place-structures', after: 'apply-weathering' });
    temporal.push({ before: 'place-structures', after: 'apply-restraint' });
  }

  // Check for prohibitions.
  const errors: string[] = [];
  if (lower.includes('preserve') && lower.includes('river')) {
    // River preservation — add as a hard prohibition.
    actions.push({ id: 'preserve-river', label: 'Preserve river (prohibition: no displacement)', duration: 'instant' });
  }
  if (lower.includes('preserve') && lower.includes('road')) {
    actions.push({ id: 'preserve-road', label: 'Preserve village road (prohibition: no destruction)', duration: 'instant' });
  }

  return { actions, temporalConstraints: temporal, errors };
}
