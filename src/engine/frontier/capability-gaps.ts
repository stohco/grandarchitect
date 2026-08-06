/**
 * Capability Gap System
 *
 * When the Grand Architect encounters a desired result that current tools
 * cannot produce accurately, it must NOT take a crude shortcut. It creates
 * a formal Capability Gap record.
 *
 * The gap is then researched, prototyped, benchmarked, and — if accepted —
 * registered as a versioned, documented, testable, undoable, reusable,
 * inspectable, benchmarked, replaceable capability.
 *
 * The AI must never create a hidden one-off patch.
 */

import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CapabilityGap {
  gapId: string;
  desiredResult: string;
  currentCapabilities: string[];
  missingCapabilities: string[];
  proposedPlugins: ProposedPlugin[];
  developmentStage: GapDevelopmentStage;
  notes: string;
  createdAt: string;
  lastUpdated: string;
  // The AI must not silently approximate — the gap must be visible
  attributableTo: 'user' | 'architect';
  // If the AI tried to approximate, this records what it did
  approximationUsed?: string;
  approximationRisk?: 'low' | 'moderate' | 'severe' | 'destructive';
}

export type GapDevelopmentStage =
  | 'identified'      // gap discovered
  | 'researching'     // looking for solutions
  | 'prototyping'     // isolated prototype being built
  | 'testing'         // prototype in testing
  | 'integrated'      // capability registered and available
  | 'blocked';        // cannot be resolved with current technology

export interface ProposedPlugin {
  pluginName: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high' | 'extreme';
  dependencies: string[];
  fallbackStrategy: string;
}

// ============================================================================
// Gap Registry
// ============================================================================

export interface CapabilityGapRegistry {
  gaps: CapabilityGap[];
  summary: {
    total: number;
    byStage: Record<GapDevelopmentStage, number>;
    highRisk: number;  // gaps with destructive approximation
    blocked: number;
  };
}

// ============================================================================
// Gap Manager
// ============================================================================

export interface CapabilityGapManager {
  /** Create a new capability gap (the Architect must do this instead of shortcutting) */
  create(params: {
    desiredResult: string;
    currentCapabilities: string[];
    missingCapabilities: string[];
    attributableTo: 'user' | 'architect';
    approximationUsed?: string;
    approximationRisk?: 'low' | 'moderate' | 'severe' | 'destructive';
  }): CapabilityGap;

  /** Add a proposed plugin to a gap */
  addProposedPlugin(gapId: string, plugin: ProposedPlugin): boolean;

  /** Update the development stage */
  updateStage(gapId: string, stage: GapDevelopmentStage, notes?: string): boolean;

  /** Get a gap by ID */
  get(gapId: string): CapabilityGap | undefined;

  /** List all gaps */
  list(): CapabilityGap[];

  /** Get gaps by stage */
  getByStage(stage: GapDevelopmentStage): CapabilityGap[];

  /** Get the full registry with summary */
  getRegistry(): CapabilityGapRegistry;

  /** Serialize for persistence */
  serialize(): string;
}

// ============================================================================
// Implementation
// ============================================================================

export function createCapabilityGapManager(): CapabilityGapManager {
  const gaps = new Map<string, CapabilityGap>();
  let counter = 0;

  function newGapId(): string {
    return `gap-${Date.now().toString(36)}-${(counter++).toString(36)}`;
  }

  return {
    create(params) {
      const gapId = newGapId();
      const now = new Date().toISOString();
      const gap: CapabilityGap = {
        gapId,
        desiredResult: params.desiredResult,
        currentCapabilities: params.currentCapabilities,
        missingCapabilities: params.missingCapabilities,
        proposedPlugins: [],
        developmentStage: 'identified',
        notes: '',
        createdAt: now,
        lastUpdated: now,
        attributableTo: params.attributableTo,
        approximationUsed: params.approximationUsed,
        approximationRisk: params.approximationRisk,
      };
      gaps.set(gapId, gap);
      return gap;
    },

    addProposedPlugin(gapId, plugin) {
      const gap = gaps.get(gapId);
      if (!gap) return false;
      gap.proposedPlugins.push(plugin);
      gap.lastUpdated = new Date().toISOString();
      return true;
    },

    updateStage(gapId, stage, notes) {
      const gap = gaps.get(gapId);
      if (!gap) return false;
      gap.developmentStage = stage;
      if (notes) gap.notes = notes;
      gap.lastUpdated = new Date().toISOString();
      return true;
    },

    get(gapId) {
      return gaps.get(gapId);
    },

    list() {
      return Array.from(gaps.values());
    },

    getByStage(stage) {
      return Array.from(gaps.values()).filter(g => g.developmentStage === stage);
    },

    getRegistry() {
      const all = Array.from(gaps.values());
      const stages: GapDevelopmentStage[] = ['identified', 'researching', 'prototyping', 'testing', 'integrated', 'blocked'];
      const byStage = {} as Record<GapDevelopmentStage, number>;
      for (const s of stages) byStage[s] = all.filter(g => g.developmentStage === s).length;
      return {
        gaps: all,
        summary: {
          total: all.length,
          byStage,
          highRisk: all.filter(g => g.approximationRisk === 'destructive' || g.approximationRisk === 'severe').length,
          blocked: all.filter(g => g.developmentStage === 'blocked').length,
        },
      };
    },

    serialize() {
      return JSON.stringify(this.getRegistry(), null, 2);
    },
  };
}

// ============================================================================
// Seed gaps — examples of the system in action
// ============================================================================

export function createSeedGaps(): CapabilityGap[] {
  const manager = createCapabilityGapManager();

  // Gap 1: Million-blade sword formation (from the user's instructions)
  const gap1 = manager.create({
    desiredResult: 'Million-blade sword formation with individual collision, coherent flock motion, and low CPU cost',
    currentCapabilities: ['CPU entity updates', 'ordinary instancing', 'simple particle system'],
    missingCapabilities: ['GPU behavior simulation', 'compact collision approximation', 'GPU visibility compaction'],
    attributableTo: 'architect',
    approximationUsed: 'Simple instanced rendering without per-blade collision',
    approximationRisk: 'moderate',
  });
  manager.addProposedPlugin(gap1.gapId, {
    pluginName: 'gpu-agent-swarm',
    description: 'GPU compute shader for flock/formation behavior simulation',
    estimatedComplexity: 'high',
    dependencies: ['WebGPU compute', 'storage buffers'],
    fallbackStrategy: 'CPU flocking with reduced blade count (10k max)',
  });
  manager.addProposedPlugin(gap1.gapId, {
    pluginName: 'sword-formation-collision-field',
    description: 'Approximate collision using scalar field rather than per-blade physics',
    estimatedComplexity: 'medium',
    dependencies: ['gpu-agent-swarm'],
    fallbackStrategy: 'No collision — visual only',
  });
  manager.updateStage(gap1.gapId, 'researching', 'Investigating GPU compute approaches');

  // Gap 2: Real-time ocean with FFT
  const gap2 = manager.create({
    desiredResult: 'Real-time FFT-based ocean simulation with realistic wave interaction',
    currentCapabilities: ['simple displaced plane mesh', 'basic vertex shader waves'],
    missingCapabilities: ['GPU FFT compute', 'wave spectrum generation', 'underwater distortion'],
    attributableTo: 'architect',
    approximationUsed: 'Simple sine-wave displacement on a plane',
    approximationRisk: 'low',
  });
  manager.addProposedPlugin(gap2.gapId, {
    pluginName: 'fft-ocean',
    description: 'GPU compute FFT for Phillips spectrum ocean waves',
    estimatedComplexity: 'high',
    dependencies: ['WebGPU compute'],
    fallbackStrategy: 'Gerstner waves on CPU (lower quality)',
  });
  manager.updateStage(gap2.gapId, 'identified');

  // Gap 3: Path-traced editor validation
  const gap3 = manager.create({
    desiredResult: 'Path-traced reference rendering for Visual Accuracy Oracle validation',
    currentCapabilities: ['rasterized rendering', 'basic shadows'],
    missingCapabilities: ['WebGPU ray tracing', 'BVH acceleration structure', 'importance sampling'],
    attributableTo: 'user',
  });
  manager.addProposedPlugin(gap3.gapId, {
    pluginName: 'editor-path-tracer',
    description: 'Offline path tracer for reference-quality validation captures',
    estimatedComplexity: 'extreme',
    dependencies: ['WebGPU ray tracing (experimental)'],
    fallbackStrategy: 'Rasterized captures with ambient occlusion',
  });
  manager.updateStage(gap3.gapId, 'blocked', 'WebGPU ray tracing not yet widely available in browsers');

  return manager.list();
}
