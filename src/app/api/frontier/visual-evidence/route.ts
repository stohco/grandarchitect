/**
 * GET /api/frontier/visual-evidence — provider list and capabilities
 * POST /api/frontier/visual-evidence — run analysis with optional validation profile
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createVisualEvidenceFabric,
  NativeVLMProvider,
  EngineTruthProvider,
  DeterministicMeasurementProvider,
  TERRAIN_VISUAL_REVIEW_PROFILE,
  AUTHORITY_POLICIES,
  type VisualCapture,
  type VisualAnalysisRequest,
  type AnalysisMode,
  type ValidationProfile,
} from '@/engine/frontier/visual-evidence-fabric';

export const runtime = 'nodejs';

const fabric = createVisualEvidenceFabric();
fabric.registerProvider(new EngineTruthProvider());
fabric.registerProvider(new NativeVLMProvider());
fabric.registerProvider(new DeterministicMeasurementProvider());

export async function GET() {
  try {
    return NextResponse.json({
      providers: fabric.listProviders(),
      authorityPolicies: Object.entries(AUTHORITY_POLICIES).map(([domain, policy]) => ({
        domain,
        preferredKinds: policy.preferredEvidenceKinds,
        requiredKinds: policy.requiredEvidenceKinds,
        humanApprovalRequired: policy.humanApprovalRequired,
      })),
      verdicts: ['insufficient-evidence', 'partial', 'consistent', 'conflicted', 'needs-human-review', 'validation-failed', 'validated'],
      validationProfiles: [TERRAIN_VISUAL_REVIEW_PROFILE],
      note: 'Authority is domain-specific, not a global ranking. Engine truth is authoritative for identity/spatial/physical/temporal/runtime/performance. Human-confirmed is authoritative for canonical/art-direction. VLM observations are model-inferred and cannot override engine truth or invent entity IDs.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, criteria, prompt, engineTruth, metadata, useValidationProfile } = body;

    if (!mode) return NextResponse.json({ error: 'mode is required' }, { status: 400 });

    const capture: VisualCapture = {
      captureId: `capture-${Date.now().toString(36)}`,
      manifest: {
        captureId: `capture-${Date.now().toString(36)}`,
        worldRevision: metadata?.worldRevision ?? 1,
        graphRevision: metadata?.graphRevision ?? 1,
        activeBundleId: metadata?.activeBundleId ?? 'unknown',
        camera: {
          position: metadata?.cameraPosition ?? [140, 100, 140],
          orientation: [0, 0, 0, 1],
          fieldOfViewDegrees: 50,
          near: 0.1,
          far: 500,
          exposure: 1.0,
        },
        viewport: { width: metadata?.width ?? 1920, height: metadata?.height ?? 1080, devicePixelRatio: 1 },
        rendererBackend: 'three.js-webgl2',
        rendererVersion: '0.185',
        qualityProfile: 'standard',
        lightingState: metadata?.lighting ?? 'directional+ambient',
        weatherState: 'clear',
        timeOfDay: 12,
        visibleEntityIds: engineTruth?.visibleEntities?.map((e: any) => e.entityId) ?? [],
        selectedEntityIds: engineTruth?.selectedEntityIds ?? [],
        buffersAvailable: ['color', 'depth', 'object-id'],
        imageHash: 'placeholder',
      },
      engineTruth: engineTruth || undefined,
    };

    const request: VisualAnalysisRequest = {
      mode: mode as AnalysisMode,
      criteria: criteria || undefined,
      prompt: prompt || undefined,
      requireStructuredOutput: true,
      validationProfile: useValidationProfile ? TERRAIN_VISUAL_REVIEW_PROFILE : undefined,
    };

    const packet = await fabric.analyze(capture, request);

    return NextResponse.json({
      ...packet,
      authorityNote: 'Domain-specific authority applies. Engine-measured assertions win for identity/spatial/physical. Human-confirmed wins for canonical/art-direction. VLM assertions are model-inferred and cannot invent engine-grounded identifiers.',
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
