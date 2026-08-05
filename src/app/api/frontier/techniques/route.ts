import { NextRequest, NextResponse } from 'next/server';
import { SEED_TECHNIQUES, getTechniquesByCategory, getTechniquesByDecision } from '@/engine/frontier/registry';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const decision = searchParams.get('decision');

    let techniques = SEED_TECHNIQUES;
    if (category) techniques = getTechniquesByCategory(techniques, category);
    if (decision) techniques = getTechniquesByDecision(techniques, decision);

    const summary = {
      total: SEED_TECHNIQUES.length,
      byCategory: SEED_TECHNIQUES.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc; }, {} as Record<string, number>),
      byDecision: SEED_TECHNIQUES.reduce((acc, t) => { acc[t.decisionStatus] = (acc[t.decisionStatus] || 0) + 1; return acc; }, {} as Record<string, number>),
      byMaturity: SEED_TECHNIQUES.reduce((acc, t) => { acc[t.maturity] = (acc[t.maturity] || 0) + 1; return acc; }, {} as Record<string, number>),
      withoutWebGLFallback: SEED_TECHNIQUES.filter(t => t.browserFeasibility.webgl2Fallback === 'none').length,
      accepted: SEED_TECHNIQUES.filter(t => t.decisionStatus === 'accepted').length,
      researching: SEED_TECHNIQUES.filter(t => t.decisionStatus === 'researching').length,
      prototyping: SEED_TECHNIQUES.filter(t => t.decisionStatus === 'prototyping').length,
    };

    return NextResponse.json({ techniques, summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
