import { NextRequest, NextResponse } from 'next/server';
import { sampleComplexity } from '@/engine/architect/rcvc/observatory/sampler';
export const runtime = 'nodejs';

const SCALES = new Set(['npc','settlement','region','planet','realm','multiverse']);
const WINDOWS = new Set(['minutes','days','years','centuries','generations']);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scale = (searchParams.get('scale') ?? 'settlement') as any;
    const window = (searchParams.get('window') ?? 'years') as any;
    const seed = parseInt(searchParams.get('seed') ?? '42', 10) || 42;
    if (!SCALES.has(scale)) return NextResponse.json({ error: 'Invalid scale' }, { status: 400 });
    if (!WINDOWS.has(window)) return NextResponse.json({ error: 'Invalid window' }, { status: 400 });
    return NextResponse.json(sampleComplexity({ scale, window, seed }));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
