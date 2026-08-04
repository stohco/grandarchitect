import { NextResponse } from 'next/server';
import { detectContradictions, formatReport } from '@/engine/architect/rcvc/verification/contradiction-detector';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const report = await detectContradictions();
    return NextResponse.json({ ...report, formatted: formatReport(report) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
