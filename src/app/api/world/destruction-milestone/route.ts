import { NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getEngineRuntime } from '@/engine/runtime/engine-runtime';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/world/destruction-milestone
 *
 * HONEST STATUS: This endpoint runs REAL assertions against the Engine Runtime.
 * Steps that cannot be verified are marked 'not-implemented' — NOT 'pass'.
 *
 * What's REAL (executable assertions):
 *   Step 1: Creates a cell via executeCommand, verifies it exists in the repository
 *   Step 3: Carves tunnel via executeCommand, verifies destructionLog grew
 *   Step 5: Strikes wall via executeCommand, verifies destructionLog grew again
 *   Step 11: Takes a snapshot, verifies content hash is deterministic
 *   Step 12: Restores snapshot, verifies cell state matches
 *   Step 13: Undoes via rollback, verifies destructionLog shrank
 *
 * What's NOT YET REAL (marked 'not-implemented'):
 *   Step 2: No renderer connected — cannot verify visual output
 *   Step 4: No physics backend — cannot verify capsule traversal
 *   Step 6: No SDF field — destruction ops are recorded but not applied to density
 *   Step 7: No mesh compiler — cannot verify remeshing
 *   Step 8: No artifact compiler — cannot verify collision/nav rebuild
 *   Step 9: No debris system — cannot verify debris spawning
 *   Step 10: No physics backend — cannot verify cavity entry
 */

interface MilestoneStep {
  step: number;
  name: string;
  status: 'pass' | 'fail' | 'not-implemented';
  details: string;
  assertion?: string;
  durationMs?: number;
}

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const runtime = getEngineRuntime();
  const steps: MilestoneStep[] = [];

  // Authenticate
  const session = runtime.gateway.authenticate({
    principalId: 'milestone-test',
    token: 'dev-token',
  });

  if (!session) {
    return NextResponse.json({ ok: false, error: 'Authentication failed' }, { status: 403 });
  }

  // Step 1: Generate mountain — REAL assertion: cell exists after command
  const step1Start = Date.now();
  try {
    const cellsBefore = runtime.world.listCells().length;
    const revBefore = runtime.world.getRevision();

    const result = await runtime.executeCommand(session, {
      commandId: `cmd-create-mountain-${Date.now().toString(36)}`,
      type: 'terrain.raise',
      payload: {
        cellId: 'mountain-milestone',
        cell: {
          cellId: 'mountain-milestone',
          revision: 1,
          bounds: { min: [0, 0, 0], max: [128, 64, 128] },
          activeLayers: ['surface-mesh', 'destructible-shell'],
          baseTerrain: {
            recipeHash: 'mountain-smooth-128m',
            seed: 42,
            type: 'mountain',
            parameters: { size: 128, height: 64 },
          },
          volumetricRegions: [],
          placedAssets: [],
          structures: [],
          ecology: { tier: 'tier-2-regional', active: false, npcCount: 0, vegetationDensity: 0.3, lastTick: 0 },
          simulation: { tier: 'tier-2-regional', activeDomains: [], simulationLOD: 2, renderDecoupled: true },
          destructionLog: [],
          derived: { render: [], collision: [], navigation: [], vegetation: [], audio: [], streaming: [] },
        },
      },
      requestedBy: session.principal,
      baseRevision: runtime.world.getRevision(),
    });

    const cellAfter = runtime.world.getCell('mountain-milestone');
    const cellsAfter = runtime.world.listCells().length;

    if (cellAfter && cellsAfter === cellsBefore + 1 && result.transaction.resultRevision === revBefore + 1) {
      steps.push({
        step: 1,
        name: 'Generate smooth 128m mountain region',
        status: 'pass',
        assertion: `cellsBefore=${cellsBefore}, cellsAfter=${cellsAfter}, cell exists=${!!cellAfter}, revision=${result.transaction.resultRevision}`,
        details: `Cell created via executeCommand('terrain.raise'). Repository now contains ${cellsAfter} cell(s).`,
        durationMs: Date.now() - step1Start,
      });
    } else {
      steps.push({
        step: 1,
        name: 'Generate smooth 128m mountain region',
        status: 'fail',
        assertion: `cell exists=${!!cellAfter}, cellsBefore=${cellsBefore}, cellsAfter=${cellsAfter}`,
        details: 'Cell was not created in the repository',
      });
    }
  } catch (err) {
    steps.push({ step: 1, name: 'Generate mountain', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Step 2: Non-blocky rendering — NOT IMPLEMENTED (no renderer)
  steps.push({
    step: 2,
    name: 'Render with non-blocky materials',
    status: 'not-implemented',
    details: 'Renderer backend is null. Cannot verify visual output. Requires connecting Three.js renderer to runtime.',
  });

  // Step 3: Carve tunnel — REAL assertion: destructionLog grew
  const step3Start = Date.now();
  try {
    const cell = runtime.world.getCell('mountain-milestone');
    const destructionBefore = cell?.destructionLog.length ?? 0;

    await runtime.executeCommand(session, {
      commandId: `cmd-tunnel-${Date.now().toString(36)}`,
      type: 'terrain.subtract-capsule',
      payload: {
        cellId: 'mountain-milestone',
        transform: { position: [64, 25, 0], rotation: [0, 0, 0, 1], scale: [4, 4, 128] },
        strength: 1.0,
        falloff: 0.5,
      },
      requestedBy: session.principal,
      baseRevision: runtime.world.getRevision(),
    });

    const cellAfter = runtime.world.getCell('mountain-milestone');
    const destructionAfter = cellAfter?.destructionLog.length ?? 0;

    if (destructionAfter === destructionBefore + 1) {
      steps.push({
        step: 3,
        name: 'Carve tunnel through mountain',
        status: 'pass',
        assertion: `destructionLog: ${destructionBefore} → ${destructionAfter}`,
        details: `subtract-capsule operation recorded in cell's destructionLog. Operation hash computed.`,
        durationMs: Date.now() - step3Start,
      });
    } else {
      steps.push({
        step: 3,
        name: 'Carve tunnel',
        status: 'fail',
        assertion: `destructionBefore=${destructionBefore}, destructionAfter=${destructionAfter}`,
        details: 'Destruction log did not grow by 1',
      });
    }
  } catch (err) {
    steps.push({ step: 3, name: 'Carve tunnel', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Step 4: Walk through tunnel — NOT IMPLEMENTED (no physics)
  steps.push({
    step: 4,
    name: 'Walk through the tunnel',
    status: 'not-implemented',
    details: 'Physics backend is null. Cannot verify capsule traversal. Requires connecting collision backend to runtime.',
  });

  // Step 5: Strike wall — REAL assertion: destructionLog grew again
  const step5Start = Date.now();
  try {
    const cell = runtime.world.getCell('mountain-milestone');
    const destructionBefore = cell?.destructionLog.length ?? 0;

    await runtime.executeCommand(session, {
      commandId: `cmd-strike-${Date.now().toString(36)}`,
      type: 'terrain.subtract-sphere',
      payload: {
        cellId: 'mountain-milestone',
        transform: { position: [50, 25, 60], rotation: [0, 0, 0, 1], scale: [3, 3, 3] },
        strength: 0.8,
        falloff: 0.3,
        techniqueId: 'flying-sword-strike',
      },
      requestedBy: session.principal,
      baseRevision: runtime.world.getRevision(),
    });

    const cellAfter = runtime.world.getCell('mountain-milestone');
    const destructionAfter = cellAfter?.destructionLog.length ?? 0;

    if (destructionAfter === destructionBefore + 1) {
      steps.push({
        step: 5,
        name: 'Strike wall with flying sword technique',
        status: 'pass',
        assertion: `destructionLog: ${destructionBefore} → ${destructionAfter}`,
        details: `subtract-sphere recorded. techniqueId=flying-sword-strike.`,
        durationMs: Date.now() - step5Start,
      });
    } else {
      steps.push({ step: 5, name: 'Strike wall', status: 'fail', details: 'Destruction log did not grow' });
    }
  } catch (err) {
    steps.push({ step: 5, name: 'Strike wall', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Steps 6-10: NOT IMPLEMENTED
  steps.push({
    step: 6,
    name: 'Remove 3-meter volume from SDF',
    status: 'not-implemented',
    details: 'No SDF field storage. Destruction ops are recorded in the log but not applied to a density field. Requires connecting terrain plugin.',
  });
  steps.push({
    step: 7,
    name: 'Remesh only affected chunks',
    status: 'not-implemented',
    details: 'No mesh compiler. Requires connecting surface extraction (Marching Cubes) to the runtime.',
  });
  steps.push({
    step: 8,
    name: 'Rebuild collision and navigation',
    status: 'not-implemented',
    details: 'No artifact compiler. Derived artifacts are invalidated but not compiled. Requires connecting collision/nav generators.',
  });
  steps.push({
    step: 9,
    name: 'Spawn limited debris and dust',
    status: 'not-implemented',
    details: 'No debris system. Requires connecting particle/physics system.',
  });
  steps.push({
    step: 10,
    name: 'Verify player can enter new cavity',
    status: 'not-implemented',
    details: 'No physics backend. Cannot verify capsule sweep against rebuilt collision.',
  });

  // Step 11: Save snapshot — REAL assertion: content hash is deterministic
  const step11Start = Date.now();
  try {
    const snapshot1 = runtime.world.snapshot();
    const snapshot2 = runtime.world.snapshot();

    // Two snapshots at the same state should have the same hash
    if (snapshot1.hash === snapshot2.hash && snapshot1.hash !== '') {
      steps.push({
        step: 11,
        name: 'Save snapshot (content hash verified)',
        status: 'pass',
        assertion: `hash=${snapshot1.hash}, two snapshots match=${snapshot1.hash === snapshot2.hash}`,
        details: `Snapshot taken at revision ${snapshot1.revision}. Content hash is deterministic (not timestamp-based). ${snapshot1.cells.length} cells.`,
        durationMs: Date.now() - step11Start,
      });
    } else {
      steps.push({ step: 11, name: 'Save snapshot', status: 'fail', details: `Hash mismatch: ${snapshot1.hash} vs ${snapshot2.hash}` });
    }
  } catch (err) {
    steps.push({ step: 11, name: 'Save snapshot', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Step 12: Reload — REAL assertion: cell state matches after restore
  const step12Start = Date.now();
  try {
    const snapshot = runtime.world.snapshot();
    const cellBefore = runtime.world.getCell('mountain-milestone');
    const destructionBefore = cellBefore?.destructionLog.length ?? 0;

    // Clear and restore
    runtime.world.restore(snapshot);
    const cellAfter = runtime.world.getCell('mountain-milestone');
    const destructionAfter = cellAfter?.destructionLog.length ?? 0;
    const revisionAfter = runtime.world.getRevision();

    if (cellAfter && destructionAfter === destructionBefore && revisionAfter === snapshot.revision) {
      steps.push({
        step: 12,
        name: 'Reload from snapshot',
        status: 'pass',
        assertion: `destructionLog: ${destructionBefore} → ${destructionAfter}, revision: ${revisionAfter} === ${snapshot.revision}`,
        details: 'Snapshot restored. Cell state matches (destruction operations preserved).',
        durationMs: Date.now() - step12Start,
      });
    } else {
      steps.push({
        step: 12,
        name: 'Reload from snapshot',
        status: 'fail',
        assertion: `destructionBefore=${destructionBefore}, after=${destructionAfter}, rev=${revisionAfter}`,
        details: 'Cell state does not match after restore',
      });
    }
  } catch (err) {
    steps.push({ step: 12, name: 'Reload', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Step 13: Undo — REAL assertion: destructionLog shrank after rollback
  const step13Start = Date.now();
  try {
    const cellBefore = runtime.world.getCell('mountain-milestone');
    const destructionBefore = cellBefore?.destructionLog.length ?? 0;
    const revisionBefore = runtime.world.getRevision();

    // Rollback to before the strike (2 transactions ago)
    const targetRevision = revisionBefore - 1;
    const rolledBack = runtime.world.rollback(targetRevision);

    const cellAfter = runtime.world.getCell('mountain-milestone');
    const destructionAfter = cellAfter?.destructionLog.length ?? 0;
    const revisionAfter = runtime.world.getRevision();

    if (rolledBack && destructionAfter === destructionBefore - 1 && revisionAfter === targetRevision) {
      steps.push({
        step: 13,
        name: 'Undo and restore wall',
        status: 'pass',
        assertion: `destructionLog: ${destructionBefore} → ${destructionAfter}, revision: ${revisionBefore} → ${revisionAfter}`,
        details: 'Rollback applied inverse operations. Last destruction operation removed from log.',
        durationMs: Date.now() - step13Start,
      });
    } else {
      steps.push({
        step: 13,
        name: 'Undo',
        status: 'fail',
        assertion: `rolledBack=${rolledBack}, destruction: ${destructionBefore} → ${destructionAfter}, rev: ${revisionBefore} → ${revisionAfter}`,
        details: 'Rollback did not restore expected state',
      });
    }
  } catch (err) {
    steps.push({ step: 13, name: 'Undo', status: 'fail', details: err instanceof Error ? err.message : 'Unknown error' });
  }

  // Summary — HONEST counts
  const passed = steps.filter((s) => s.status === 'pass').length;
  const failed = steps.filter((s) => s.status === 'fail').length;
  const notImplemented = steps.filter((s) => s.status === 'not-implemented').length;

  return NextResponse.json({
    ok: failed === 0,
    milestone: 'First Destruction Milestone',
    sequence: 'smooth mountain → tunnel → strike → remesh → rebuild collision/nav → verify → save → reload → undo',
    steps,
    summary: {
      total: steps.length,
      passed,
      failed,
      notImplemented,
      verdict: failed === 0 ? (notImplemented === 0 ? 'PASS' : 'PARTIAL') : 'FAIL',
      honest: `${passed} real assertions passed, ${notImplemented} not yet implemented, ${failed} failed`,
    },
    runtimeInfo: runtime.getInfo(),
    registeredCommandTypes: ['terrain.raise', 'terrain.subtract-sphere', 'terrain.subtract-capsule', 'world.create-cell', 'transaction.undo'],
  });
}
