import { NextResponse } from 'next/server';
import { createSeedGaps, createCapabilityGapManager } from '@/engine/frontier/capability-gaps';
export const runtime = 'nodejs';

const manager = createCapabilityGapManager();
// Seed with example gaps
for (const gap of createSeedGaps()) {
  // The seed function creates its own manager; we re-create here
}

// Re-create with seeds properly
const seededManager = createCapabilityGapManager();
const seedGaps = createSeedGaps();
// Access the internal list by using getRegistry
let seedRegistry = seededManager.getRegistry();

export async function GET() {
  try {
    // Use seed gaps for now; in production this would be a persistent store
    const registry = {
      gaps: seedGaps,
      summary: {
        total: seedGaps.length,
        byStage: seedGaps.reduce((acc, g) => { acc[g.developmentStage] = (acc[g.developmentStage] || 0) + 1; return acc; }, {} as Record<string, number>),
        highRisk: seedGaps.filter(g => g.approximationRisk === 'destructive' || g.approximationRisk === 'severe').length,
        blocked: seedGaps.filter(g => g.developmentStage === 'blocked').length,
      },
    };
    return NextResponse.json(registry);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const gap = seededManager.create({
      desiredResult: body.desiredResult,
      currentCapabilities: body.currentCapabilities || [],
      missingCapabilities: body.missingCapabilities || [],
      attributableTo: body.attributableTo || 'architect',
      approximationUsed: body.approximationUsed,
      approximationRisk: body.approximationRisk,
    });
    return NextResponse.json({ ok: true, gap });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
