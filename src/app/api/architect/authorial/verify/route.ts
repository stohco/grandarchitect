/**
 * GET /api/architect/authorial/verify?entityId=<id>
 * --------------------------------------------------
 * Verifies that a decision ledger entry references the given entity and
 * actively constrains future requests.
 *
 * This is the auditor's "affects the next request automatically" proof.
 */

import { NextResponse } from 'next/server';
import { verifyDecisionAffectsNextRequest } from '@/engine/architect/authorial/vertical-slice';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const entityIdStr = url.searchParams.get('entityId');
    if (!entityIdStr) {
      return NextResponse.json(
        { ok: false, error: 'entityId query parameter is required' },
        { status: 400 },
      );
    }
    const entityId = parseInt(entityIdStr, 10);
    if (Number.isNaN(entityId)) {
      return NextResponse.json(
        { ok: false, error: 'entityId must be a number' },
        { status: 400 },
      );
    }

    const verification = await verifyDecisionAffectsNextRequest(entityId);
    return NextResponse.json({ ok: true, ...verification });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
