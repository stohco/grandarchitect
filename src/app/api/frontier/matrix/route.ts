import { NextResponse } from 'next/server';
import { CAPABILITY_MATRIX } from '@/engine/frontier/registry';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(CAPABILITY_MATRIX);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
