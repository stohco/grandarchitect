/**
 * POST /api/architect/authorial/run
 * ---------------------------------
 * Run the complete 13-stage Authorial Grand Architect vertical slice.
 *
 * Body: {
 *   request: string;
 *   selectedEntityId: number;
 *   structureKind: string;
 *   structureName: string;
 *   worldPosition: { x: number; z: number };
 *   dryRun?: boolean;
 * }
 *
 * Returns: VerticalSliceResult (the full stage-by-stage trace).
 */

import { NextResponse } from 'next/server';
import {
  runAuthorialVerticalSlice,
  persistSliceTrace,
  type VerticalSliceInput,
} from '@/engine/architect/authorial/vertical-slice';
import { compileBible } from '@/engine/architect/authorial/bible-compiler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<VerticalSliceInput>;

    // Validate input.
    const errors: string[] = [];
    if (!body.request || typeof body.request !== 'string') {
      errors.push('request is required (string)');
    }
    if (typeof body.selectedEntityId !== 'number') {
      errors.push('selectedEntityId is required (number)');
    }
    if (!body.structureKind || typeof body.structureKind !== 'string') {
      errors.push('structureKind is required (string)');
    }
    if (!body.structureName || typeof body.structureName !== 'string') {
      errors.push('structureName is required (string)');
    }
    if (!body.worldPosition || typeof body.worldPosition.x !== 'number' || typeof body.worldPosition.z !== 'number') {
      errors.push('worldPosition {x,z} is required');
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Invalid input', errors }, { status: 400 });
    }

    // Ensure the Bible is compiled before running.
    await compileBible();

    const input: VerticalSliceInput = {
      request: body.request!,
      selectedEntityId: body.selectedEntityId!,
      structureKind: body.structureKind!,
      structureName: body.structureName!,
      worldPosition: body.worldPosition!,
      dryRun: body.dryRun ?? false,
    };

    const result = await runAuthorialVerticalSlice(input);

    // Persist the trace so the auditor can inspect prior runs.
    await persistSliceTrace(result);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, stack: (err as Error).stack },
      { status: 500 },
    );
  }
}

/**
 * GET /api/architect/authorial/run
 * --------------------------------
 * Returns the most recent vertical slice traces (for the UI panel).
 */
export async function GET() {
  try {
    const { listSliceTraces } = await import('@/engine/architect/authorial/vertical-slice');
    const traces = await listSliceTraces();
    return NextResponse.json({ ok: true, traces });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
