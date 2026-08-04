import { NextRequest, NextResponse } from 'next/server';
import { createConstraintService } from '@/engine/architect/rcvc/constraints/service';
import type { ConstraintProblem } from '@/engine/architect/rcvc/types';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = body.problem ?? body;
    if (!raw || !Array.isArray(raw.variables) || !Array.isArray(raw.constraints)) {
      return NextResponse.json({ error: 'Invalid constraint problem' }, { status: 400 });
    }
    // The constraint service expects `vars`, but the GET sample returns
    // `variables`. Normalise here so callers can use either key.
    const problem: ConstraintProblem = {
      vars: raw.vars ?? raw.variables,
      constraints: raw.constraints,
      seed: raw.seed,
    };
    const service = createConstraintService();
    return NextResponse.json(service.solve(problem));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET() {
  // A real solvable sample problem: place a sect's main hall and gate
  // such that they're within 40m of each other (path connectivity), the
  // main hall is north of the river floodplain, and (soft) the gate sits
  // on the south side for feng shui. Variables use float domains and
  // constraints use the actual IR (Term/ConstraintExpression).
  return NextResponse.json({
    problem: {
      variables: [
        { name: 'mainHallX', domain: { kind: 'float', min: -50, max: 50 }, description: 'Main hall X coordinate (m)', tag: 'position' },
        { name: 'mainHallZ', domain: { kind: 'float', min: -50, max: 50 }, description: 'Main hall Z coordinate (m)', tag: 'position' },
        { name: 'gateX', domain: { kind: 'float', min: -50, max: 50 }, description: 'Gate X coordinate (m)', tag: 'position' },
        { name: 'gateZ', domain: { kind: 'float', min: -50, max: 50 }, description: 'Gate Z coordinate (m)', tag: 'position' },
      ],
      constraints: [
        {
          id: 'c1',
          statement: 'Path connects buildings: distance ≤ 40 m',
          vars: ['mainHallX', 'mainHallZ', 'gateX', 'gateZ'],
          // (Δx)² + (Δz)² ≤ 1600
          expr: {
            t: 'le',
            a: {
              t: 'add',
              a: {
                t: 'mul',
                a: { t: 'sub', a: { t: 'var', name: 'mainHallX' }, b: { t: 'var', name: 'gateX' } },
                b: { t: 'sub', a: { t: 'var', name: 'mainHallX' }, b: { t: 'var', name: 'gateX' } },
              },
              b: {
                t: 'mul',
                a: { t: 'sub', a: { t: 'var', name: 'mainHallZ' }, b: { t: 'var', name: 'gateZ' } },
                b: { t: 'sub', a: { t: 'var', name: 'mainHallZ' }, b: { t: 'var', name: 'gateZ' } },
              },
            },
            b: { t: 'const', value: 1600 },
          },
          weight: 'hard',
        },
        {
          id: 'c2',
          statement: 'Main hall north of the river floodplain (z ≥ -10)',
          vars: ['mainHallZ'],
          expr: { t: 'ge', a: { t: 'var', name: 'mainHallZ' }, b: { t: 'const', value: -10 } },
          weight: 'hard',
        },
        {
          id: 'c3',
          statement: 'Gate on the south side for feng shui (z ≤ 20)',
          vars: ['gateZ'],
          expr: { t: 'le', a: { t: 'var', name: 'gateZ' }, b: { t: 'const', value: 20 } },
          weight: 'soft',
          penalty: 0.5,
        },
      ],
      objective: 'minimize_cost',
    },
    description: 'Sample sect layout: place main hall + gate with path, floodplain, and feng-shui constraints.',
  });
}
