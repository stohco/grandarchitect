/**
 * FiberLab Manager
 * =================
 *
 * In-memory store for SceneCapsules. Manages the experiment lifecycle:
 * create → run → capture → fork → compare → benchmark → promote/reject.
 *
 * FiberLab is a development-only experiment laboratory. It does NOT have
 * world mutation authority. Capsules are experimental code that must go
 * through a promotion pipeline before becoming production capabilities.
 */

import type { SceneCapsule, CaptureArtifact, SceneMeasurements, PromotionRequest, PromotionResult, CaptureType } from './scene-capsule';
import { createCapsule, DEFAULT_BUDGETS, createDefaultEnvironment } from './scene-capsule';

class FiberLabManager {
  private capsules = new Map<string, SceneCapsule>();
  private runningCapsules = new Set<string>();
  private counter = 0;

  create(
    title: string,
    description: string,
    category: SceneCapsule['category'],
    code: string,
    createdBy: 'user' | 'architect' | 'system' = 'user',
  ): SceneCapsule {
    const capsule = createCapsule(title, description, category, code, createdBy);
    this.capsules.set(capsule.capsuleId, capsule);
    return capsule;
  }

  get(capsuleId: string): SceneCapsule | null {
    return this.capsules.get(capsuleId) ?? null;
  }

  list(): SceneCapsule[] {
    return Array.from(this.capsules.values()).sort((a, b) =>
      b.provenance.createdAt.localeCompare(a.provenance.createdAt),
    );
  }

  listByCategory(category: string): SceneCapsule[] {
    return this.list().filter((c) => c.category === category);
  }

  listByMaturity(maturity: string): SceneCapsule[] {
    return this.list().filter((c) => c.maturity === maturity);
  }

  run(capsuleId: string): boolean {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return false;
    this.runningCapsules.add(capsuleId);
    capsule.maturity = 'running';
    return true;
  }

  stop(capsuleId: string): boolean {
    this.runningCapsules.delete(capsuleId);
    return true;
  }

  isRunning(capsuleId: string): boolean {
    return this.runningCapsules.has(capsuleId);
  }

  getRunning(): string[] {
    return Array.from(this.runningCapsules);
  }

  capture(
    capsuleId: string,
    type: CaptureType,
    data: string,
    cameraPosition: [number, number, number],
    cameraTarget: [number, number, number],
    buildSha?: string,
  ): CaptureArtifact | null {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return null;

    const capture: CaptureArtifact = {
      captureId: `capture-${++this.counter}-${Date.now().toString(36)}`,
      type,
      data,
      cameraTransform: { position: cameraPosition, target: cameraTarget },
      viewport: {
        width: capsule.environment.viewport.width,
        height: capsule.environment.viewport.height,
        dpr: capsule.environment.viewport.devicePixelRatio,
      },
      capturedAt: new Date().toISOString(),
      buildSha,
      capsuleRevision: capsule.revision,
    };

    capsule.captures.push(capture);
    return capture;
  }

  updateMeasurements(capsuleId: string, measurements: SceneMeasurements): boolean {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return false;
    capsule.measurements = measurements;
    if (measurements.budgetExceeded) {
      capsule.maturity = 'rejected';
      this.runningCapsules.delete(capsuleId);
    }
    return true;
  }

  fork(capsuleId: string, newTitle?: string): SceneCapsule | null {
    const parent = this.capsules.get(capsuleId);
    if (!parent) return null;

    const forked = createCapsule(
      newTitle ?? `${parent.title} (fork)`,
      parent.description,
      parent.category,
      parent.source.code,
      parent.provenance.createdBy,
    );

    forked.forkedFrom = capsuleId;
    forked.environment = { ...parent.environment };
    forked.budgets = { ...parent.budgets };
    forked.tags = [...parent.tags];
    forked.provenance.instruction = `Forked from ${capsuleId}`;

    this.capsules.set(forked.capsuleId, forked);
    return forked;
  }

  updateCode(capsuleId: string, code: string): boolean {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return false;
    capsule.revision++;
    capsule.source.code = code;
    capsule.source.codeHash = hashCode(code);
    capsule.source.dependencies = extractDependencies(code);
    return true;
  }

  setMaturity(capsuleId: string, maturity: SceneCapsule['maturity']): boolean {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return false;
    capsule.maturity = maturity;
    return true;
  }

  promote(request: PromotionRequest): PromotionResult {
    const capsule = this.capsules.get(request.capsuleId);
    if (!capsule) {
      return { success: false, message: 'Capsule not found', remainingSteps: [] };
    }

    if (!request.benchmarkPassed) {
      return {
        success: false,
        message: 'Benchmark must pass before promotion',
        remainingSteps: ['Run benchmark', 'Verify budgets'],
      };
    }

    if (capsule.captures.length === 0) {
      return {
        success: false,
        message: 'No captures — visual evidence required',
        remainingSteps: ['Capture color view', 'Capture performance'],
      };
    }

    // Mark as promoted
    capsule.maturity = 'promoted';
    this.runningCapsules.delete(request.capsuleId);

    const capabilityId = `promoted-${request.target}-${request.capsuleId}`;

    return {
      success: true,
      promotedCapabilityId: capabilityId,
      message: `Capsule "${capsule.title}" promoted to ${request.target}. ` +
        `Capability ID: ${capabilityId}. ` +
        `Next: integrate as provider-neutral contract, add conformance tests, run browser verification.`,
      remainingSteps: [
        'Write provider-neutral contract',
        'Integrate as plugin/module',
        'Add conformance tests',
        'Browser verification (Firefox + Chromium)',
        'Production terrain tests',
      ],
    };
  }

  reject(capsuleId: string, reason: string): boolean {
    const capsule = this.capsules.get(capsuleId);
    if (!capsule) return false;
    capsule.maturity = 'rejected';
    capsule.tags.push(`rejected:${reason}`);
    this.runningCapsules.delete(capsuleId);
    return true;
  }

  search(query: string): SceneCapsule[] {
    const q = query.toLowerCase();
    return this.list().filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  getStats(): {
    totalCapsules: number;
    running: number;
    byMaturity: Record<string, number>;
    byCategory: Record<string, number>;
    totalCaptures: number;
  } {
    const byMaturity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalCaptures = 0;

    for (const c of this.list()) {
      byMaturity[c.maturity] = (byMaturity[c.maturity] ?? 0) + 1;
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
      totalCaptures += c.captures.length;
    }

    return {
      totalCapsules: this.capsules.size,
      running: this.runningCapsules.size,
      byMaturity,
      byCategory,
      totalCaptures,
    };
  }
}

function hashCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function extractDependencies(code: string): string[] {
  const deps: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    deps.push(match[1]);
  }
  return deps;
}

// Singleton
let instance: FiberLabManager | null = null;

export function getFiberLab(): FiberLabManager {
  if (!instance) {
    instance = new FiberLabManager();
  }
  return instance;
}
