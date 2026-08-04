/**
 * POST /api/architect/interpret
 *
 * Interprets a natural-language request into multiple hypotheses
 * using the weakest-sufficient interpretation principle.
 *
 * Body: { request: string, selectionIds?: string[], observerPosition?: [number,number,number] }
 * Returns: { hypotheses: ArchitectHypothesis[], weakest?: ArchitectHypothesis, clarifications: ClarificationQuestion[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRCVCService, getClarificationQuestions } from '@/engine/architect/rcvc';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { request, selectionIds, observerPosition } = body as {
      request: string;
      selectionIds?: string[];
      observerPosition?: [number, number, number];
    };

    if (!request || typeof request !== 'string') {
      return NextResponse.json({ error: 'Missing "request" field' }, { status: 400 });
    }

    const service = createRCVCService();
    const hypotheses = service.interpret(request, {
      selectionIds,
      observerPosition,
      autonomy: 'Diagnose',
    });

    // Select the weakest sufficient hypothesis
    const weakest = hypotheses.find(h => h.requiresClarification === true && h.confidence > 0.4)
      ?? hypotheses[0];

    // Generate clarification questions for the weakest hypothesis
    const clarifications = weakest ? getClarificationQuestions(weakest) : [];

    return NextResponse.json({
      hypotheses,
      weakest,
      clarifications,
      count: hypotheses.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
