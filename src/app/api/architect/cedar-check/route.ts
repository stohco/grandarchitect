/**
 * GET /api/architect/cedar-check
 * -----------------------------------
 * Tests Cedar WASM initialization and runs authorization checks for
 * the 8 canonical authorial actions.
 *
 * Per the FRONTIER_TECHNOLOGY_MATRIX.md directive, Cedar determines:
 *   - May the Architect inspect authorial-only mystery truth?
 *   - May it modify accepted canon?
 *   - May it execute a destructive world action?
 *   - May a plugin access the filesystem?
 *
 * This endpoint proves the Cedar adapter actually initializes and can
 * evaluate real authorization policies.
 */

import { NextResponse } from 'next/server';
import { getCedarAuthorizer, authorizeAction } from '@/engine/architect/cedar-auth';
// getCedarAuthorizer is already imported above
import type { Principal } from '@/engine/world/world-fabric';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const cedar = getCedarAuthorizer();
    await cedar.ensureInitialized();

    if (!cedar.isAvailable()) {
      return NextResponse.json({
        ok: false,
        available: false,
        reason: cedar.getReason(),
      });
    }

    // Test authorization for various principals and actions.
    const architectPrincipal: Principal = {
      principalId: 'authorial-grand-architect',
      role: 'architect',
      autonomyLevel: 'assisted',
    };

    const pluginPrincipal: Principal = {
      principalId: 'external-plugin-1',
      role: 'system', // Will be treated as plugin in the request
      autonomyLevel: 'manual',
    };

    const userPrincipal: Principal = {
      principalId: 'user',
      role: 'user',
      autonomyLevel: 'manual',
    };

    const tests = [
      {
        name: 'Architect previews terrain',
        principal: architectPrincipal,
        action: 'preview.terrain',
        resource: { type: 'world' as const, id: 'cell-1' },
        expected: true,
      },
      {
        name: 'Architect commits terrain with approval',
        principal: architectPrincipal,
        action: 'commit.terrain',
        resource: { type: 'world' as const, id: 'cell-1' },
        context: { hasApproval: true, previewPassed: true },
        expected: true,
      },
      {
        name: 'Architect commits terrain WITHOUT approval',
        principal: architectPrincipal,
        action: 'commit.terrain',
        resource: { type: 'world' as const, id: 'cell-1' },
        context: { hasApproval: false, previewPassed: false },
        expected: false,
      },
      {
        name: 'Architect inspects mystery truth',
        principal: architectPrincipal,
        action: 'inspect.mystery',
        resource: { type: 'mystery' as const, id: 'mystery-1' },
        expected: true,
      },
      {
        name: 'Plugin inspects mystery truth (FORBIDDEN)',
        principal: { principalId: 'external-plugin-1', role: 'system' as const, autonomyLevel: 'manual' as const },
        action: 'inspect.mystery',
        resource: { type: 'mystery' as const, id: 'mystery-1' },
        expected: false,
        isPlugin: true,
      },
      {
        name: 'Plugin commits world (FORBIDDEN)',
        principal: { principalId: 'external-plugin-1', role: 'system' as const, autonomyLevel: 'manual' as const },
        action: 'commit.world',
        resource: { type: 'world' as const, id: 'world-1' },
        expected: false,
        isPlugin: true,
      },
      {
        name: 'Architect modifies protagonist identity WITHOUT retcon (FORBIDDEN)',
        principal: architectPrincipal,
        action: 'modify.protagonist-identity',
        resource: { type: 'canon' as const, id: 'protagonist-1' },
        context: { hasRetconRecord: false },
        expected: false,
      },
      {
        name: 'Architect modifies protagonist identity WITH retcon',
        principal: architectPrincipal,
        action: 'modify.protagonist-identity',
        resource: { type: 'canon' as const, id: 'protagonist-1' },
        context: { hasRetconRecord: true },
        expected: true,
      },
    ];

    const results: Array<{
      name: string;
      action: string;
      expected: boolean;
      actual: boolean;
      passed: boolean;
      reason: string;
      policyId: string | undefined;
    }> = [];
    for (const test of tests) {
      // For plugin tests, pass role as 'plugin' in the request (not in Principal).
      const result = test.isPlugin
        ? await getCedarAuthorizer().authorize({
            principal: { id: test.principal.principalId, role: 'plugin', autonomyLevel: 'manual' },
            action: test.action,
            resource: test.resource,
            context: test.context,
          })
        : await authorizeAction(test.principal, test.action, test.resource, test.context);
      results.push({
        name: test.name,
        action: test.action,
        expected: test.expected,
        actual: result.allowed,
        passed: result.allowed === test.expected,
        reason: result.reason,
        policyId: result.policyId,
      });
    }

    const allPassed = results.every((r) => r.passed);

    return NextResponse.json({
      ok: true,
      available: cedar.isAvailable(),
      version: cedar.getVersion(),
      reason: cedar.getReason(),
      testsRun: results.length,
      testsPassed: results.filter((r) => r.passed).length,
      allPassed,
      results,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message,
      stack: (err as Error).stack,
    }, { status: 500 });
  }
}
