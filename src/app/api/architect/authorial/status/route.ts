/**
 * GET /api/architect/authorial/status
 * ------------------------------------
 * Returns the current authorial state — decision ledger stats, resumable
 * loop, recent slice traces, Bible source span verification.
 *
 * Used by the Authorial panel to show "is the system actually durable?"
 */

import { NextResponse } from 'next/server';
import { getDecisionLedgers } from '@/engine/architect/authorial/decision-ledgers';
import { getUnboundLoop } from '@/engine/architect/authorial/unbound-loop';
import { listSliceTraces, getResumableSlice, verifyBibleSourceSpans } from '@/engine/architect/authorial/vertical-slice';
import { loadCompiledBible } from '@/engine/architect/authorial/bible-compiler';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const ledgers = getDecisionLedgers();
    const loop = getUnboundLoop();

    const [stats, narrative, loops, slices, resumable, bible, spanVerification] = await Promise.all([
      ledgers.getStats(),
      ledgers.getNarrative('default'),
      loop.list(),
      listSliceTraces(),
      getResumableSlice(),
      loadCompiledBible(),
      verifyBibleSourceSpans(),
    ]);

    return NextResponse.json({
      ok: true,
      ledgerStats: stats,
      narrativePromises: narrative.narrativePromises.length,
      thematicMotifs: narrative.thematicMotifs.length,
      loops: loops.slice(0, 10).map((l) => ({
        loopId: l.loopId,
        stage: l.stage,
        completed: l.completed,
        paused: l.paused,
        originalRequest: l.originalRequest,
        startedAt: l.startedAt,
        updatedAt: l.updatedAt,
      })),
      recentSlices: slices.slice(0, 5).map((s) => ({
        loopId: s.loopId,
        input: s.input.request,
        completed: s.completed,
        finalStage: s.finalStage,
        decisionLedgerEntryId: s.decisionLedgerEntryId,
        narrativePromiseId: s.narrativePromiseId,
        startedAt: s.startedAt,
        totalDurationMs: s.totalDurationMs,
      })),
      resumable,
      bible: {
        canonRules: bible.canon.length,
        styleConstraints: bible.style.length,
        spanVerification: {
          verified: spanVerification.verified,
          spansChecked: spanVerification.spansChecked,
          results: spanVerification.results.slice(0, 12),
        },
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
