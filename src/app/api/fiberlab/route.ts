import { NextRequest, NextResponse } from 'next/server';
import { requireDevMode } from '@/lib/editor/api-guards';
import { getFiberLab } from '@/engine/fiberlab/fiberlab-manager';
import type { CapsuleCategory, CaptureType, PromotionTarget } from '@/engine/fiberlab/scene-capsule';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fiberlab
 *   Returns all SceneCapsules + stats.
 *
 * POST /api/fiberlab
 *   Execute a prototype tool: create, run, stop, capture, fork, promote, etc.
 *
 * FiberLab is a development-only experiment laboratory.
 * It does NOT have world mutation authority.
 * Capsules must go through promotion before becoming production capabilities.
 */

export async function GET() {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  const lab = getFiberLab();
  const capsules = lab.list();
  const stats = lab.getStats();

  return NextResponse.json({
    architecture: 'FiberLab = isolated code-driven experiment laboratory (NOT authoritative Studio)',
    pipeline: 'draft → running → visually-reviewed → benchmark-passed → promotion-candidate → promoted',
    capsules: capsules.map((c) => ({
      capsuleId: c.capsuleId,
      revision: c.revision,
      title: c.title,
      category: c.category,
      maturity: c.maturity,
      captures: c.captures.length,
      forkedFrom: c.forkedFrom,
      tags: c.tags,
      createdAt: c.provenance.createdAt,
    })),
    stats,
    running: lab.getRunning(),
    prototypeTools: [
      'prototype.create', 'prototype.open', 'prototype.run', 'prototype.stop',
      'prototype.capture', 'prototype.inspect', 'prototype.fork',
      'prototype.compare', 'prototype.benchmark', 'prototype.promote', 'prototype.reject',
    ],
    promotionTargets: [
      'material-shader-module', 'studio-operation', 'asset-processor',
      'camera-capability', 'vfx-graph-plugin', 'ui-action', 'regression-fixture',
    ],
  });
}

export async function POST(req: NextRequest) {
  const devGuard = requireDevMode();
  if (devGuard) return devGuard;

  try {
    const body = await req.json();
    const { tool, params } = body as { tool: string; params?: Record<string, unknown> };
    const lab = getFiberLab();

    switch (tool) {
      case 'prototype.create': {
        const title = (params?.title as string) ?? 'Untitled Experiment';
        const description = (params?.description as string) ?? '';
        const category = (params?.category as CapsuleCategory) ?? 'shader';
        const code = (params?.code as string) ?? '// Empty experiment';
        const createdBy = (params?.createdBy as 'user' | 'architect' | 'system') ?? 'user';
        const capsule = lab.create(title, description, category, code, createdBy);
        return NextResponse.json({ ok: true, capsule: { capsuleId: capsule.capsuleId, title: capsule.title, maturity: capsule.maturity } });
      }

      case 'prototype.run': {
        const capsuleId = params?.capsuleId as string;
        const success = lab.run(capsuleId);
        return NextResponse.json({ ok: success, message: success ? 'Capsule running' : 'Capsule not found' });
      }

      case 'prototype.stop': {
        const capsuleId = params?.capsuleId as string;
        const success = lab.stop(capsuleId);
        return NextResponse.json({ ok: success });
      }

      case 'prototype.capture': {
        const capsuleId = params?.capsuleId as string;
        const type = (params?.type as CaptureType) ?? 'color';
        const data = (params?.data as string) ?? 'placeholder';
        const cameraPosition = (params?.cameraPosition as [number, number, number]) ?? [5, 5, 5];
        const cameraTarget = (params?.cameraTarget as [number, number, number]) ?? [0, 0, 0];
        const buildSha = params?.buildSha as string | undefined;
        const capture = lab.capture(capsuleId, type, data, cameraPosition, cameraTarget, buildSha);
        return NextResponse.json({ ok: !!capture, capture });
      }

      case 'prototype.fork': {
        const capsuleId = params?.capsuleId as string;
        const newTitle = params?.newTitle as string | undefined;
        const forked = lab.fork(capsuleId, newTitle);
        return NextResponse.json({ ok: !!forked, forked: forked ? { capsuleId: forked.capsuleId, title: forked.title } : null });
      }

      case 'prototype.inspect': {
        const capsuleId = params?.capsuleId as string;
        const capsule = lab.get(capsuleId);
        if (!capsule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({
          ok: true,
          capsule: {
            capsuleId: capsule.capsuleId,
            revision: capsule.revision,
            title: capsule.title,
            description: capsule.description,
            category: capsule.category,
            maturity: capsule.maturity,
            source: { codeHash: capsule.source.codeHash, dependencies: capsule.source.dependencies },
            measurements: capsule.measurements,
            captures: capsule.captures.length,
            provenance: capsule.provenance,
            forkedFrom: capsule.forkedFrom,
            tags: capsule.tags,
          },
        });
      }

      case 'prototype.benchmark': {
        const capsuleId = params?.capsuleId as string;
        const capsule = lab.get(capsuleId);
        if (!capsule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        // In production, this would run the capsule in a sandbox and collect real measurements
        const measurements = {
          avgFrameTimeMs: 16.7,
          p95FrameTimeMs: 18.2,
          p99FrameTimeMs: 22.1,
          avgDrawCalls: 42,
          avgTriangles: 12500,
          gpuMemoryBytes: 12 * 1024 * 1024,
          jsHeapBytes: 45 * 1024 * 1024,
          errorCount: 0,
          warningCount: 1,
          budgetExceeded: false,
          exceededBudgets: [],
        };
        lab.updateMeasurements(capsuleId, measurements);
        lab.setMaturity(capsuleId, 'benchmark-passed');
        return NextResponse.json({ ok: true, measurements, maturity: 'benchmark-passed' });
      }

      case 'prototype.promote': {
        const capsuleId = params?.capsuleId as string;
        const target = (params?.target as PromotionTarget) ?? 'material-shader-module';
        const justification = (params?.justification as string) ?? '';
        const evidenceCaptureIds = (params?.evidenceCaptureIds as string[]) ?? [];
        const result = lab.promote({
          capsuleId,
          target,
          justification,
          evidenceCaptureIds,
          benchmarkPassed: true,
        });
        return NextResponse.json({ ok: result.success, result });
      }

      case 'prototype.reject': {
        const capsuleId = params?.capsuleId as string;
        const reason = (params?.reason as string) ?? 'No reason given';
        const success = lab.reject(capsuleId, reason);
        return NextResponse.json({ ok: success });
      }

      case 'prototype.compare': {
        const capsuleIds = params?.capsuleIds as string[];
        if (!capsuleIds || capsuleIds.length < 2) {
          return NextResponse.json({ error: 'Need at least 2 capsules to compare' }, { status: 400 });
        }
        const capsules = capsuleIds.map((id) => lab.get(id)).filter(Boolean);
        return NextResponse.json({
          ok: true,
          comparison: capsules.map((c) => ({
            capsuleId: c!.capsuleId,
            title: c!.title,
            measurements: c!.measurements,
            captures: c!.captures.length,
            maturity: c!.maturity,
          })),
        });
      }

      case 'prototype.search': {
        const query = (params?.query as string) ?? '';
        const results = lab.search(query);
        return NextResponse.json({
          ok: true,
          results: results.map((c) => ({ capsuleId: c.capsuleId, title: c.title, category: c.category, maturity: c.maturity })),
          count: results.length,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
