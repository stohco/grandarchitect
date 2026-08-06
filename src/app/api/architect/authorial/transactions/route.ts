/**
 * GET /api/architect/authorial/transactions
 * ------------------------------------------
 * Returns full per-transaction detail for the most recent vertical slice.
 *
 * This answers the auditor's question: "Command 1 changed what?
 * Command 2 changed what?"
 *
 * For each transaction, returns:
 *   - action ID (which authorial action)
 *   - command type (world.create-cell, etc.)
 *   - input payload hash (deterministic hash of the operation input)
 *   - targeted entity (which structure)
 *   - before/after world revision
 *   - affected cells
 *   - forward operations (apply to go from base → result)
 *   - inverse operations (apply to undo)
 *   - invalidated artifacts
 *   - requested by
 *   - timestamp
 *   - undo result (if undone)
 */

import { NextResponse } from 'next/server';
import { listSliceTraces } from '@/engine/architect/authorial/vertical-slice';
import { getEngineRuntime } from '@/engine/runtime/engine-runtime';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const traces = await listSliceTraces();
    if (traces.length === 0) {
      return NextResponse.json({
        ok: true,
        transactions: [],
        message: 'No vertical slices have been run yet.',
      });
    }

    const mostRecent = traces[0];
    const details = mostRecent.transactionDetails ?? [];

    // Also fetch the actual runtime transaction records to cross-reference.
    const runtime = getEngineRuntime();
    const runtimeTxs = runtime.world.getTransactions();

    return NextResponse.json({
      ok: true,
      sliceLoopId: mostRecent.loopId,
      sliceInput: mostRecent.input,
      sliceCompleted: mostRecent.completed,
      transactionCount: details.length,
      transactions: details.map((d) => ({
        transactionId: d.transactionId,
        actionId: d.actionId,
        operationId: d.operationId,
        commandType: d.commandType,
        commandId: d.commandId,
        inputPayloadHash: d.inputPayloadHash,
        targetEntityId: d.targetEntityId,
        targetStructureKind: d.targetStructureKind,
        beforeRevision: d.beforeRevision,
        afterRevision: d.afterRevision,
        affectedCells: d.affectedCells,
        forwardOperations: d.forwardOperations,
        inverseOperations: d.inverseOperations,
        invalidatedArtifacts: d.invalidatedArtifacts,
        requestedBy: d.requestedBy,
        timestamp: d.timestamp,
        undoResult: d.undoResult,
        // Cross-reference with runtime transaction history
        runtimeTransactionExists: runtimeTxs.some((t) => t.id === d.transactionId),
      })),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
