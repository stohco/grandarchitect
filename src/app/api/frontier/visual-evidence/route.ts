/**
 * GET /api/frontier/visual-evidence
 *
 * Returns the Visual Evidence Fabric provider list and capabilities.
 *
 * POST /api/frontier/visual-evidence
 * Body: { mode, criteria?, prompt?, imageData?, engineTruth? }
 * Returns a fused evidence packet from all registered providers.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createVisualEvidenceFabric,
  NativeVLMProvider,
  EngineTruthProvider,
  DeterministicMeasurementProvider,
  type VisualCapture,
  type VisualAnalysisRequest,
  type AnalysisMode,
} from '@/engine/frontier/visual-evidence-fabric';

export const runtime = 'nodejs';

// Singleton fabric with registered providers
const fabric = createVisualEvidenceFabric();
fabric.registerProvider(new EngineTruthProvider());
fabric.registerProvider(new NativeVLMProvider());
fabric.registerProvider(new DeterministicMeasurementProvider());

export async function GET() {
  try {
    const providers = fabric.listProviders();
    return NextResponse.json({
      providers,
      providerCount: providers.length,
      evidenceKinds: ['engine-measured', 'pixel-measured', 'human-confirmed', 'text-extracted', 'model-inferred'],
      analysisModes: [
        'scene-interpretation', 'visual-fidelity-review', 'ocr-text-extraction',
        'layout-analysis', 'asset-comparison', 'style-grammar-compliance',
        'scale-and-proportion-review', 'animation-review', 'ui-review',
        'ambiguous-target-resolution',
      ],
      authorityOrder: 'engine-measured > pixel-measured > human-confirmed > text-extracted > model-inferred',
      note: 'Engine truth overrides model inference for identity, coordinates, scale, collision, timing. VLM judgments are model-inferred, not authoritative.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, criteria, prompt, engineTruth, metadata } = body;

    if (!mode) {
      return NextResponse.json({ error: 'mode is required' }, { status: 400 });
    }

    const capture: VisualCapture = {
      captureId: `capture-${Date.now().toString(36)}`,
      engineTruth: engineTruth || undefined,
      metadata: {
        width: metadata?.width ?? 1920,
        height: metadata?.height ?? 1080,
        source: metadata?.source ?? 'editor-viewport',
        cameraPosition: metadata?.cameraPosition,
        cameraTarget: metadata?.cameraTarget,
        renderMode: metadata?.renderMode,
      },
    };

    const request: VisualAnalysisRequest = {
      mode: mode as AnalysisMode,
      criteria: criteria || undefined,
      prompt: prompt || undefined,
      requireStructuredOutput: true,
    };

    const packet = await fabric.analyze(capture, request);

    return NextResponse.json({
      ...packet,
      providerCount: fabric.listProviders().length,
      authorityNote: 'Engine-measured observations override model-inferred for identity, coordinates, scale, collision, timing.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
