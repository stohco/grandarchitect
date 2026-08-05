/**
 * GET /api/architect/claims
 *
 * Returns the claim-level ground-truth registry.
 * Every claim has: stable ID, truth level, exact statement, source/provenance,
 * confidence, dependencies, approval status.
 *
 * All claims are CANDIDATE (not approved) until human-reviewed.
 * This is the foundation for proper semantic validation.
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { extractClaims, validateClaims } from '@/engine/architect/rcvc/claims/extractor';
import { validateSemanticGraph } from '@/engine/architect/rcvc/claims/semantic-validator';
import { validateNumericalConstraints } from '@/engine/architect/rcvc/claims/numerical-validator';
import { validateProvenance } from '@/engine/architect/rcvc/claims/provenance-validator';
import { reviewSemanticClaims } from '@/engine/architect/rcvc/claims/semantic-review';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Try to load cached registry first; if not found, extract fresh
    let registry;
    try {
      const cached = await readFile(join(process.cwd(), 'data', 'claims', 'registry.json'), 'utf-8');
      registry = JSON.parse(cached);
    } catch {
      registry = await extractClaims();
    }

    const structuralValidation = validateClaims(registry);
    const semanticValidation = validateSemanticGraph(registry);
    const numericalValidation = validateNumericalConstraints(registry);
    const provenanceValidation = await validateProvenance(registry);
    const semanticReview = reviewSemanticClaims(registry);

    return NextResponse.json({
      ...registry,
      validation: structuralValidation,
      semanticValidation,
      numericalValidation,
      provenanceValidation,
      semanticReview,
      coverage: {
        layersImplemented: [
          '1-structural-schema (provenance, source, dependencies, approval status)',
          '2-semantic-graph (cross-claim relationship validation)',
          '3-numerical-constraint (measurement consistency)',
          '4-provenance (source exists, supports claim, approval record, no self-citation, no forged approval)',
          '5-natural-language-semantic (heuristic duplicate/ambiguity/contradiction detection — PROPOSES findings, does not auto-decide)',
        ],
        layersNotImplemented: [
          '6-runtime-enforcement (engine compliance)',
        ],
        totalRequiredLayers: 6,
        layersImplementedCount: 5,
        layersNotImplementedCount: 1,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
