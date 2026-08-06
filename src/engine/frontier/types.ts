/**
 * frontier/types.ts — Shared types for the frontier engine.
 *
 * The frontier engine is a self-contained, deterministic character-controller
 * + terrain pipeline used by the Live Architect Studio. It is intentionally
 * free of three.js / WebGL dependencies so the same code runs headless inside
 * an API route and inside the browser viewport.
 *
 * Determinism contract:
 *   - Same input seed → same output, every run, every runtime.
 *   - No Math.random() in any code path reachable from `update()`.
 *   - All "randomness" comes from LCG (see prng.ts).
 *   - All transcendental functions (sin/cos/sqrt) are permitted because
 *     IEEE-754 + libc are deterministic across V8/SpiderMonkey/JSC for the
 *     operations we use (sin/cos/sqrt/pow/atan2). The determinism firewall
 *     in src/lib/determinism/transcendentals.ts documents this.
 */

/** Plain 3D vector. Mutating operations are avoided; prefer pure helpers. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned bounding box. */
export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** A triangle in world space. */
export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

/** A capsule defined by a segment (top→bottom) and a radius. */
export interface Capsule {
  /** Top of the inner segment. */
  top: Vec3;
  /** Bottom of the inner segment. */
  bottom: Vec3;
  /** Radius around the segment. */
  radius: number;
}

/** A ray in world space. */
export interface Ray {
  origin: Vec3;
  dir: Vec3; // assumed normalized
}

/** Result of a ray-vs-triangle intersection. */
export interface RaycastHit {
  point: Vec3;
  normal: Vec3;
  distance: number;
  /** Triangle index in the source mesh. */
  triangleIndex: number;
}

/** Result of a capsule-vs-triangle collision. */
export interface SweepHit {
  /** Closest point on the capsule segment. */
  capsulePoint: Vec3;
  /** Closest point on the triangle. */
  trianglePoint: Vec3;
  /** Push direction (normalized). Always points from triangle → capsule. */
  normal: Vec3;
  /** Penetration depth: radius - distance. Positive when overlapping. */
  penetration: number;
  /** Distance from the segment's start to the closest point (0..1 along segment). */
  segmentParam: number;
  /** Triangle index in the source mesh. */
  triangleIndex: number;
}

/** A triangle mesh in CPU-readable form. */
export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
}

/** A collision test fixture — programmatic geometry + spawn info. */
export interface CollisionFixture {
  name: string;
  description: string;
  mesh: MeshData;
  /** Where to spawn the capsule (center). */
  spawn: Vec3;
  /** Capsule radius to use when testing this fixture. */
  capsuleRadius: number;
  /** Capsule inner-segment height (top - bottom). */
  capsuleHeight: number;
}

/** Result of a single collision fixture run. */
export interface CollisionTestResult {
  name: string;
  passed: boolean;
  details: string;
  /** Final capsule position after 100 ticks. */
  finalPosition: Vec3;
  /** Whether the capsule reported grounded at the final tick. */
  grounded: boolean;
  /** Number of ticks where NaN was detected (must be 0 to pass). */
  nanTicks: number;
  /** Whether the capsule fell through the floor (y < -10). */
  fellThrough: boolean;
  /** Trajectory hash (SHA-256 hex) for replay verification. */
  trajectoryHash: string;
  /** Total ticks simulated. */
  ticks: number;
}

/** Aggregated collision test summary. */
export interface CollisionTestSummary {
  tests: CollisionTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/** A checkpoint along the tunnel spline. */
export interface CheckpointRecord {
  /** Spline parameter t ∈ [0,1]. */
  t: number;
  /** World position of the checkpoint (on the spline centerline). */
  position: Vec3;
  /** Cumulative distance traveled when reached. 0 until first reached. */
  cumulativeDistance: number;
  /** Tick number when first reached. -1 until reached. */
  reachedTick: number;
}

/** Result of `getCheckpointProgress()`. */
export interface CheckpointProgress {
  reached: number;
  total: number;
  positions: Vec3[];
  /** Cumulative distance traveled (sum of step distances, not spline arc length). */
  distanceTraveled: number;
  /** Hex SHA-256 of the recorded trajectory (positions every 10 ticks). */
  trajectoryHash: string;
}
<<<<<<< HEAD
=======

// ---------------------------------------------------------------------------
// Frontier Technique Registry Types
// ---------------------------------------------------------------------------

export interface FrontierTechniqueRecord {
  id: string;
  name: string;
  category: string;
  problemSolved: string;
  observedSources: Array<{
    type: string;
    title: string;
    author?: string;
    url?: string;
  }>;
  underlyingPrinciples: string[];
  maturity: 'research' | 'prototype' | 'integrated' | 'production';
  licenseAssessment: {
    license: string;
    compatible: boolean;
    notes?: string;
  };
  browserFeasibility: {
    browserFeasible: boolean;
    webgpuRequired?: boolean;
    webgl2Fallback?: string;
    notes?: string;
  };
  webgpuRequirements?: Array<{
    feature: string;
    required: boolean;
    fallback?: string;
  }>;
  benchmarks?: Array<{
    metric: string;
    value: string;
    source: string;
  }>;
  decisionStatus: 'researching' | 'candidate' | 'accepted' | 'rejected' | 'blocked';
  integrationPlan?: string;
  runtimeAuthority: 'none' | 'candidate' | 'validated' | 'authoritative';
  currentBlocker?: string;
  paperRef?: string;
}

export interface CapabilityMatrixEntry {
  capabilityId: string;
  capabilityName: string;
  category: string;
  byBackend: {
    webgpu: string;
    webgl2: string;
    headless: string;
  };
  byProfile: Record<string, string>;
  fallbackStrategy?: string;
  notes?: string;
}

export interface CapabilityMatrix {
  entries: CapabilityMatrixEntry[];
}
>>>>>>> 7a4f5e29fb7830ff0142679ec9c1732b964d1184
