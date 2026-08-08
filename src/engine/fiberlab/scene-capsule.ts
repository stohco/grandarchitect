import { deterministicId } from '../../lib/determinism/primitives';
/**
 * SceneCapsule — FiberLab Experiment Type
 * ========================================
 *
 * A SceneCapsule is an isolated code-driven visual experiment. It lets the
 * Grand Architect rapidly write, run, inspect, capture, fork, compare, and
 * refine small React Three Fiber scenes before promoting successful work
 * into proper engine capabilities.
 *
 * FiberLab is NOT the authoritative Studio. SceneCapsule code is experimental.
 * It must NOT replace MeshKernel, WorldRepository, AssetRevision, or any
 * authoritative engine system. Promotion is the boundary.
 *
 * Lifecycle:
 *   draft → running → visually-reviewed → benchmark-passed
 *     → promotion-candidate → promoted (or rejected)
 *
 * Promotion pipeline:
 *   FiberLab experiment
 *     → static/security review
 *     → identify capability type
 *     → translate or extract implementation
 *     → write provider-neutral contract
 *     → integrate as plugin/module
 *     → add conformance tests
 *     → benchmark
 *     → browser verification
 *     → promotion
 */

// ---------------------------------------------------------------------------
// SceneCapsule
// ---------------------------------------------------------------------------

let capSeq = 0;

export type CapsuleCategory =
  | 'shader'
  | 'material'
  | 'geometry'
  | 'vfx'
  | 'camera'
  | 'interaction'
  | 'benchmark'
  | 'plugin-demo'
  | 'regression-fixture';

export type ExperimentMaturity =
  | 'draft'
  | 'running'
  | 'visually-reviewed'
  | 'benchmark-passed'
  | 'promotion-candidate'
  | 'promoted'
  | 'rejected';

export interface SceneCapsule {
  capsuleId: string;
  revision: number;

  title: string;
  description: string;
  category: CapsuleCategory;

  source: {
    language: 'tsx';
    code: string;
    /** Hash of the source code for provenance. */
    codeHash: string;
    /** Declared dependencies (must be in the allowed import list). */
    dependencies: string[];
  };

  environment: ExperimentEnvironment;
  budgets: ExperimentBudgets;
  captures: CaptureArtifact[];
  measurements: SceneMeasurements;
  provenance: ArtifactProvenance;
  maturity: ExperimentMaturity;

  /** If this capsule was forked, the parent capsule ID. */
  forkedFrom?: string;
  /** Tags for searchability. */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export interface ExperimentEnvironment {
  threeVersion: string;
  reactThreeFiberVersion: string;
  dreiVersion: string;
  viewport: ViewportConfiguration;
  qualityProfile: 'legacy' | 'mainstream' | 'ultra';
  /** Deterministic seed for reproducible experiments. */
  seed?: number;
  /** Whether network access is allowed (default: false). */
  networkAllowed: boolean;
}

export interface ViewportConfiguration {
  width: number;
  height: number;
  devicePixelRatio: number;
  cameraType: 'perspective' | 'orthographic';
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fov: number;
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export interface ExperimentBudgets {
  /** Maximum execution time before forced termination (ms). */
  maxExecutionMs: number;
  /** Maximum frame time (ms) — watchdog kills experiment if exceeded. */
  maxFrameTimeMs: number;
  /** Maximum draw calls per frame. */
  maxDrawCalls: number;
  /** Maximum triangles per frame. */
  maxTriangles: number;
  /** Maximum texture memory (bytes). */
  maxTextureBytes: number;
  /** Maximum JS heap size (bytes). */
  maxHeapBytes: number;
}

export const DEFAULT_BUDGETS: ExperimentBudgets = {
  maxExecutionMs: 30_000,
  maxFrameTimeMs: 33, // ~30fps minimum
  maxDrawCalls: 500,
  maxTriangles: 500_000,
  maxTextureBytes: 128 * 1024 * 1024, // 128 MB
  maxHeapBytes: 256 * 1024 * 1024, // 256 MB
};

// ---------------------------------------------------------------------------
// Captures
// ---------------------------------------------------------------------------

export type CaptureType =
  | 'color'
  | 'object-id'
  | 'depth'
  | 'normal'
  | 'material-id'
  | 'wireframe'
  | 'topology'
  | 'performance';

export interface CaptureArtifact {
  captureId: string;
  type: CaptureType;
  /** Image data URL (base64 PNG) or performance JSON. */
  data: string;
  /** Camera transform at capture time. */
  cameraTransform: {
    position: [number, number, number];
    target: [number, number, number];
  };
  /** Viewport at capture time. */
  viewport: { width: number; height: number; dpr: number };
  /** Timestamp. */
  capturedAt: string;
  /** Build SHA when captured. */
  buildSha?: string;
  /** Capsule revision when captured. */
  capsuleRevision: number;
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

export interface SceneMeasurements {
  /** Average frame time in ms. */
  avgFrameTimeMs: number;
  /** p95 frame time in ms. */
  p95FrameTimeMs: number;
  /** p99 frame time in ms. */
  p99FrameTimeMs: number;
  /** Average draw calls per frame. */
  avgDrawCalls: number;
  /** Average triangles per frame. */
  avgTriangles: number;
  /** Total GPU memory used (bytes). */
  gpuMemoryBytes: number;
  /** JS heap size (bytes). */
  jsHeapBytes: number;
  /** Number of errors during execution. */
  errorCount: number;
  /** Number of warnings. */
  warningCount: number;
  /** Whether budgets were exceeded. */
  budgetExceeded: boolean;
  /** Which budgets were exceeded. */
  exceededBudgets: string[];
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface ArtifactProvenance {
  createdBy: 'user' | 'architect' | 'system';
  createdAt: string;
  /** Git commit SHA when created. */
  commitSha?: string;
  /** If created by Architect, which provider/model. */
  providerId?: string;
  modelVersion?: string;
  /** Original instruction that led to this capsule. */
  instruction?: string;
}

// ---------------------------------------------------------------------------
// Sandbox Messaging Protocol
// ---------------------------------------------------------------------------

export interface SandboxEnvelope<T = unknown> {
  protocolVersion: number;
  sessionId: string;
  nonce: string;
  sequence: number;
  type: SandboxMessageType;
  payload: T;
}

export type SandboxMessageType =
  | 'initialize'      // Parent → Sandbox: send source code
  | 'ready'           // Sandbox → Parent: ready for code
  | 'compiled'        // Sandbox → Parent: code compiled successfully
  | 'error'           // Sandbox → Parent: compilation or runtime error
  | 'frame'           // Sandbox → Parent: frame statistics
  | 'capture-request' // Parent → Sandbox: request a capture
  | 'capture-result'  // Sandbox → Parent: capture data
  | 'budget-exceeded' // Sandbox → Parent: budget limit hit
  | 'heartbeat'       // Sandbox → Parent: still alive
  | 'stop'            // Parent → Sandbox: stop execution
  | 'stopped';        // Sandbox → Parent: confirmed stopped

// ---------------------------------------------------------------------------
// Prototype Tools (Grand Architect)
// ---------------------------------------------------------------------------

export type PrototypeTool =
  | 'prototype.create'
  | 'prototype.open'
  | 'prototype.run'
  | 'prototype.stop'
  | 'prototype.capture'
  | 'prototype.inspect'
  | 'prototype.fork'
  | 'prototype.compare'
  | 'prototype.benchmark'
  | 'prototype.promote'
  | 'prototype.reject';

export interface PrototypeToolResult {
  tool: PrototypeTool;
  success: boolean;
  message: string;
  capsuleId?: string;
  captureIds?: string[];
  measurements?: SceneMeasurements;
  error?: string;
}

// ---------------------------------------------------------------------------
// Promotion
// ---------------------------------------------------------------------------

export type PromotionTarget =
  | 'material-shader-module'
  | 'studio-operation'
  | 'asset-processor'
  | 'camera-capability'
  | 'vfx-graph-plugin'
  | 'ui-action'
  | 'regression-fixture';

export interface PromotionRequest {
  capsuleId: string;
  target: PromotionTarget;
  justification: string;
  evidenceCaptureIds: string[];
  benchmarkPassed: boolean;
}

export interface PromotionResult {
  success: boolean;
  promotedCapabilityId?: string;
  message: string;
  remainingSteps: string[];
}

// ---------------------------------------------------------------------------
// Default Environment
// ---------------------------------------------------------------------------

export function createDefaultEnvironment(): ExperimentEnvironment {
  return {
    threeVersion: '0.185.1',
    reactThreeFiberVersion: '9.0.0',
    dreiVersion: '10.0.0',
    viewport: {
      width: 800,
      height: 600,
      devicePixelRatio: 1,
      cameraType: 'perspective',
      cameraPosition: [5, 5, 5],
      cameraTarget: [0, 0, 0],
      fov: 50,
    },
    qualityProfile: 'mainstream',
    seed: 42,
    networkAllowed: false,
  };
}

// ---------------------------------------------------------------------------
// Helper: Create empty capsule
// ---------------------------------------------------------------------------

export function createCapsule(
  title: string,
  description: string,
  category: CapsuleCategory,
  code: string,
  createdBy: 'user' | 'architect' | 'system',
): SceneCapsule {
  const now = new Date().toISOString();
  const capsuleId = deterministicId('capsule', 'fiberlab', [Date.now(), capSeq++]);

  return {
    capsuleId,
    revision: 1,
    title,
    description,
    category,
    source: {
      language: 'tsx',
      code,
      codeHash: hashCode(code),
      dependencies: extractDependencies(code),
    },
    environment: createDefaultEnvironment(),
    budgets: DEFAULT_BUDGETS,
    captures: [],
    measurements: {
      avgFrameTimeMs: 0,
      p95FrameTimeMs: 0,
      p99FrameTimeMs: 0,
      avgDrawCalls: 0,
      avgTriangles: 0,
      gpuMemoryBytes: 0,
      jsHeapBytes: 0,
      errorCount: 0,
      warningCount: 0,
      budgetExceeded: false,
      exceededBudgets: [],
    },
    provenance: {
      createdBy,
      createdAt: now,
    },
    maturity: 'draft',
    tags: [],
  };
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
