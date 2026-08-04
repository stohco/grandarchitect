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

    return NextResponse.json({
      ...registry,
      validation: structuralValidation,
      semanticValidation,
      numericalValidation,
      coverage: {
        layersImplemented: [
          'claim-level-structural (provenance, source, dependencies)',
          'semantic-graph (cross-claim relationship validation)',
          'numerical-constraint (measurement consistency)',
        ],
        layersNotImplemented: [
          'natural-language-semantic (AI contradiction review)',
          'runtime (generation/asset/animation compliance)',
        ],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
