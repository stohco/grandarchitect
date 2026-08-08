/**
 * frontier/character-controller.ts — Deterministic capsule character controller.
 *
 * This is the frontier engine's character controller. It is intentionally
 * independent of three.js so it can run headless in API routes and inside
 * web workers. All randomness comes from LCG (prng.ts).
 *
 * Architecture:
 *   - The capsule is represented as a vertical segment (top, bottom) + radius.
 *   - Movement is integrated in fixed timesteps (the caller chooses dt).
 *   - Collision is resolved by sweeping the capsule along its velocity and
 *     pushing the capsule out of every overlapping triangle.
 *   - Grounding is determined by probing the BVH downward from the capsule
 *     center: the highest hit within the footprint is the ground.
 *
 * Determinism contract:
 *   - Same input state + same BVH + same input → same output state, every run.
 *   - No Math.random anywhere. The controller uses LCG for any "random"
 *     decisions (currently: none, but the field is present for future use
 *     e.g. procedural footstep jitter).
 *   - Trajectory is recorded every 10 ticks and hashed with SHA-256 for
 *     replay verification.
 *
 * Checkpoint system:
 *   - 5 ordered checkpoints along a tunnel spline (entrance, interior-1,
 *     midpoint, interior-2, exit).
 *   - Each checkpoint records: position, timestamp reached (tick), cumulative
 *     distance traveled when reached.
 *   - getCheckpointProgress() returns reached/total + positions + distance.
 *
 * Trajectory hashing:
 *   - Position is recorded every 10 ticks into a Float32Array.
 *   - On demand, the trajectory is encoded deterministically and hashed
 *     with SHA-256 (via @noble/hashes — pure JS, deterministic).
 */

import type { Vec3, SweepHit, MeshData, CheckpointRecord, CheckpointProgress } from './types';
import { vec3, add, sub, scale, length, normalize, dot, hasNaN, clone } from './vec3';
import { buildBVH, queryCapsule, probeGround, intersectRay, type BVH } from './bvh';
import { LCG } from '../../lib/determinism/primitives';
import { encodeFloatsForHash } from '../../lib/determinism/primitives';
import { nobleSha256 } from './hash-shim';

// ============================================================================
// Constants
// ============================================================================

/** Default gravity (m/s²). Positive = downward acceleration. */
const DEFAULT_GRAVITY = 22.0;

/** Default capsule radius (m). */
const DEFAULT_RADIUS = 0.4;

/** Default capsule inner-segment height (m). The total capsule height = 2*radius + height. */
const DEFAULT_HEIGHT = 1.6;

/** Distance below the capsule bottom to probe for ground. */
const GROUND_PROBE_DEPTH = 0.3;

/**
 * Skin width: small buffer used by the overlap-resolve step.
 * When the capsule is penetrating a triangle, we push it out by the
 * penetration amount + this skin width (so the capsule ends up `SKIN_WIDTH`
 * meters away from the triangle, not touching it).
 *
 * IMPORTANT: this is NOT used by the sweep detection. The sweep uses
 * SWEEP_SKIN_WIDTH (below) so that "just touching" doesn't block movement.
 */
const SKIN_WIDTH = 0.015;

/**
 * Sweep skin width: tolerance for the sweep's collision detection.
 * Set to 0 so that "just touching" (penetration = 0) does NOT count as a
 * collision — only actual overlaps (penetration > 0) block movement.
 *
 * This is critical for resting behavior: when the capsule is resting on the
 * floor (penetration = 0), horizontal movement must NOT be blocked. With a
 * positive skin width, the sweep would falsely detect a collision and refuse
 * to move the capsule horizontally.
 *
 * Floating-point errors that cause the capsule to penetrate by 1e-10 are
 * handled by the resolve step (which uses SKIN_WIDTH = 0.015).
 */
const SWEEP_SKIN_WIDTH = 0.0;

/** Maximum number of substeps when resolving a single update tick. */
const MAX_SUBSTEPS = 8;

/** Maximum number of bounces (slide recursions) per substep. */
const MAX_BOUNCES = 4;

/** Tick interval at which trajectory positions are recorded. */
const TRAJECTORY_SAMPLE_INTERVAL = 10;

/** Maximum speed the controller can move (m/s). Caps velocity to prevent tunneling. */
const MAX_SPEED = 60.0;

/**
 * Distance within which the capsule is considered "grounded".
 * Must be > SKIN_WIDTH because the sweep's "last good position" can leave
 * the capsule up to SKIN_WIDTH above the floor.
 */
const GROUND_SNAP_THRESHOLD = 0.05;

// ============================================================================
// Input / state
// ============================================================================

/** Per-tick input from the player (or AI). */
export interface ControllerInput {
  /** Desired horizontal movement direction (world-space, normalized). */
  moveX: number;
  moveZ: number;
  /** Desired movement magnitude (m/s). 0 = stand still. */
  moveSpeed: number;
  /** True to jump (only effective when grounded). */
  jump: boolean;
  /** Jump impulse magnitude (m/s, upward). */
  jumpStrength: number;
}

/** Snapshot of the controller's deterministic state. */
export interface ControllerState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  tick: number;
  distanceTraveled: number;
}

// ============================================================================
// Character controller
// ============================================================================

/**
 * A deterministic capsule character controller.
 *
 * Construction:
 *   const controller = new CharacterController({ mesh, spawn, radius, height });
 *   controller.update(dt, input);  // call once per tick
 *
 * The controller owns:
 *   - A reference to the BVH built from the supplied mesh.
 *   - The capsule's current position and velocity.
 *   - A list of 5 ordered checkpoints along a tunnel spline (optional).
 *   - A trajectory buffer (positions every 10 ticks).
 *   - An LCG instance for any randomized decisions (currently unused).
 */
export class CharacterController {
  /** The BVH for collision queries. */
  readonly bvh: BVH;
  /** Capsule radius. */
  readonly radius: number;
  /** Capsule inner-segment height (top - bottom). */
  readonly height: number;
  /** Gravity (m/s²). */
  readonly gravity: number;

  /** Current capsule center position (midpoint of inner segment). */
  position: Vec3;
  /** Current velocity (m/s). */
  velocity: Vec3;
  /** True if the capsule is grounded (within GROUND_PROBE_DEPTH of the surface). */
  grounded: boolean = false;
  /** Current tick count. */
  tick: number = 0;
  /** Cumulative distance traveled (sum of step magnitudes). */
  distanceTraveled: number = 0;

  /** Surface normal at the current ground contact (or up if airborne). */
  groundNormal: Vec3 = { x: 0, y: 1, z: 0 };

  /** Y coordinate of the current ground contact (or 0 if airborne). */
  groundY: number = 0;

  /** Deterministic RNG for any randomized controller decisions. */
  prng: LCG;

  /** Trajectory samples: position every TRAJECTORY_SAMPLE_INTERVAL ticks. */
  private trajectory: number[] = []; // flat: [x0,y0,z0, x1,y1,z1, ...]

  /** Checkpoints along the tunnel spline (may be empty if no spline). */
  private checkpoints: CheckpointRecord[] = [];

  constructor(opts: {
    mesh: MeshData;
    spawn: Vec3;
    radius?: number;
    height?: number;
    gravity?: number;
    seed?: number;
    checkpoints?: CheckpointRecord[];
  }) {
    this.bvh = buildBVH(opts.mesh.positions, opts.mesh.indices);
    this.radius = opts.radius ?? DEFAULT_RADIUS;
    this.height = opts.height ?? DEFAULT_HEIGHT;
    this.gravity = opts.gravity ?? DEFAULT_GRAVITY;
    this.position = clone(opts.spawn);
    this.velocity = { x: 0, y: 0, z: 0 };
    this.prng = new LCG(opts.seed ?? 0x12345678);
    if (opts.checkpoints && opts.checkpoints.length > 0) {
      this.checkpoints = opts.checkpoints.map(c => ({
        t: c.t,
        position: clone(c.position),
        cumulativeDistance: 0,
        reachedTick: -1,
      }));
    }
  }

  // --------------------------------------------------------------------------
  // Capsule geometry
  // --------------------------------------------------------------------------

  /** Compute the inner segment endpoints from the current position. */
  getCapsuleSegment(): { top: Vec3; bottom: Vec3 } {
    const half = this.height * 0.5;
    return {
      top: { x: this.position.x, y: this.position.y + half, z: this.position.z },
      bottom: { x: this.position.x, y: this.position.y - half, z: this.position.z },
    };
  }

  /** Get the current controller state as a snapshot. */
  getState(): ControllerState {
    return {
      position: clone(this.position),
      velocity: clone(this.velocity),
      grounded: this.grounded,
      tick: this.tick,
      distanceTraveled: this.distanceTraveled,
    };
  }

  /** Restore from a snapshot. */
  setState(s: ControllerState): void {
    this.position = clone(s.position);
    this.velocity = clone(s.velocity);
    this.grounded = s.grounded;
    this.tick = s.tick;
    this.distanceTraveled = s.distanceTraveled;
  }

  // --------------------------------------------------------------------------
  // Sweep
  // --------------------------------------------------------------------------

  /**
   * Sweep the capsule from `from` to `to` (both are capsule CENTER positions),
   * returning ALL hits found along the swept path.
   *
   * This performs a discrete sweep: subdivides the movement into N steps and
   * tests static capsule-vs-mesh at each step. The first colliding step is
   * returned; if multiple steps collide, all are returned.
   *
   * For a continuous (analytic) sweep, we would compute the time-of-impact
   * for each triangle. The discrete approach is simpler, robust, and what
   * most game character controllers use (e.g. Unity's CharacterController).
   *
   * The `substeps` parameter controls precision. With substeps=8 and a max
   * speed of 60 m/s at dt=1/60s, the per-substep movement is 0.125 m, well
   * below the capsule radius — so the controller cannot tunnel through any
   * triangle thicker than 0.125 m. (Our terrain walls are 1+ m thick.)
   */
  sweepCapsuleDetailed(
    from: Vec3,
    to: Vec3,
    substeps = MAX_SUBSTEPS,
  ): { hits: SweepHit[]; travelFraction: number; finalPos: Vec3 } {
    const delta = sub(to, from);
    const moveLen = length(delta);
    if (moveLen < 1e-9) {
      // No movement — just test static.
      const { top, bottom } = this._segmentAt(from);
      const hits = queryCapsule(this.bvh, top, bottom, this.radius, SWEEP_SKIN_WIDTH);
      return { hits, travelFraction: 0, finalPos: clone(from) };
    }

    const stepLen = moveLen / substeps;
    const step = scale(delta, 1 / substeps);
    let lastGoodPos = clone(from);

    for (let i = 1; i <= substeps; i++) {
      const candidate = add(from, scale(delta, i / substeps));
      const { top, bottom } = this._segmentAt(candidate);
      const hits = queryCapsule(this.bvh, top, bottom, this.radius, SWEEP_SKIN_WIDTH);

      if (hits.length > 0) {
        // We hit something at this step. Return all hits, and the position
        // just before contact (last good position).
        return {
          hits,
          travelFraction: (i - 1) / substeps,
          finalPos: lastGoodPos,
        };
      }
      lastGoodPos = candidate;
    }

    // No hit across the full sweep.
    return { hits: [], travelFraction: 1, finalPos: clone(to) };
  }

  /**
   * Sweep the capsule and return the FIRST hit (or null if none).
   * Convenience wrapper around sweepCapsuleDetailed.
   */
  sweepCapsule(from: Vec3, to: Vec3, substeps = MAX_SUBSTEPS): SweepHit | null {
    const result = this.sweepCapsuleDetailed(from, to, substeps);
    return result.hits.length > 0 ? result.hits[0] : null;
  }

  /** Compute inner segment endpoints for a given CENTER position. */
  private _segmentAt(center: Vec3): { top: Vec3; bottom: Vec3 } {
    const half = this.height * 0.5;
    return {
      top: { x: center.x, y: center.y + half, z: center.z },
      bottom: { x: center.x, y: center.y - half, z: center.z },
    };
  }

  // --------------------------------------------------------------------------
  // Ground detection
  // --------------------------------------------------------------------------

  /**
   * Probe the ground directly below the capsule center.
   *
   * The probe originates from JUST ABOVE the bottom of the capsule's lower
   * hemisphere (segment bottom - radius) and casts downward by
   * GROUND_PROBE_DEPTH. This catches the floor even when the capsule is
   * resting on it (the hemisphere bottom is at floor level, so the probe
   * needs to start just above the hemisphere bottom).
   *
   * Sets this.grounded, this.groundNormal, and this.groundY.
   * Returns the probe result.
   */
  detectGround(): { y: number; normal: Vec3; hit: boolean } {
    return this._updateGrounding();
  }

  /**
   * Internal: update grounding state.
   *
   * The capsule is "grounded" if the highest ground point under the footprint
   * is within GROUND_SNAP_THRESHOLD of the capsule's bottom hemisphere.
   * This threshold is larger than SKIN_WIDTH to handle the case where the
   * sweep's "last good position" leaves the capsule a few mm above the floor.
   */
  private _updateGrounding(): { y: number; normal: Vec3; hit: boolean } {
    const capsuleHemisphereBottomY = this.position.y - this.height * 0.5 - this.radius;
    // Start the probe slightly above the hemisphere bottom (so the ray doesn't
    // start INSIDE the floor when the capsule is resting exactly on it).
    const probeOrigin = {
      x: this.position.x,
      y: capsuleHemisphereBottomY + 0.02,
      z: this.position.z,
    };
    const probe = probeGround(
      this.bvh,
      probeOrigin,
      this.radius * 0.9,
      GROUND_PROBE_DEPTH,
      4, // 4 ring samples + 1 center = 5 rays
    );
    this.groundNormal = probe.normal;
    this.groundY = probe.hit ? probe.y : 0;
    // Gap = how far the hemisphere bottom is ABOVE the floor.
    // Positive = capsule is above floor (or touching). Negative = penetrating.
    const gap = capsuleHemisphereBottomY - this.groundY;
    // Grounded if the probe hit AND the gap is within the snap threshold.
    // (We allow a small negative gap to handle the case where the sweep
    // left the capsule slightly penetrating due to skinWidth.)
    this.grounded = probe.hit && gap <= GROUND_SNAP_THRESHOLD;
    return probe;
  }

  // --------------------------------------------------------------------------
  // Update (main tick)
  // --------------------------------------------------------------------------

  /**
   * Advance the controller by one tick.
   *
   * Steps:
   *   1. Apply gravity to velocity (ALWAYS — the collision system stops the
   *      fall, not the grounded check. This prevents the "floating above
   *      the floor" bug where the grounded check fires too early).
   *   2. Apply input movement to horizontal velocity.
   *   3. Jump (only if grounded).
   *   4. Clamp velocity to MAX_SPEED.
   *   5. Substep-resolve: move the capsule in small increments, push out of
   *      any triangles encountered, and slide along them.
   *   6. Update grounding (probe downward from the hemisphere bottom).
   *   7. If grounded: snap the hemisphere bottom to the floor and zero out
   *      downward velocity (so the next tick doesn't accumulate downward
   *      momentum that the collision system would just cancel).
   *   8. Track distance traveled.
   *   9. Update checkpoints.
   *   10. Record trajectory (every TRAJECTORY_SAMPLE_INTERVAL ticks).
   *   11. NaN guard: if any NaN creeps into the state, reset to last good state.
   */
  update(dt: number, input: ControllerInput): void {
    const prevState = this.getState();
    const half = this.height * 0.5;

    // -- 1. Gravity (always applied; the collision system stops the fall).
    this.velocity.y -= this.gravity * dt;

    // -- 2. Input movement (horizontal).
    // Replace horizontal velocity with input-driven velocity.
    // (We use kinematic horizontal control; vertical is gravity-driven.)
    this.velocity.x = input.moveX * input.moveSpeed;
    this.velocity.z = input.moveZ * input.moveSpeed;

    // -- 3. Jump
    if (input.jump && this.grounded) {
      this.velocity.y = input.jumpStrength;
      this.grounded = false;
    }

    // -- 4. Clamp speed.
    const speed = length(this.velocity);
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed;
      this.velocity.x *= s;
      this.velocity.y *= s;
      this.velocity.z *= s;
    }

    // -- 5. Compute desired displacement and resolve with substeps + bounces.
    const displacement = scale(this.velocity, dt);
    let remaining = clone(displacement);
    let bounced = 0;
    while (bounced < MAX_BOUNCES) {
      const from = clone(this.position);
      const to = add(from, remaining);
      const sweep = this.sweepCapsuleDetailed(from, to, MAX_SUBSTEPS);

      // Move to the unblocked position.
      this.position = sweep.finalPos;

      if (sweep.hits.length === 0) {
        // Full movement succeeded.
        break;
      }

      // Push out of any triangles we're currently overlapping at the final position.
      this._resolveOverlaps();

      // Slide along the contact normal: project remaining movement onto the
      // plane perpendicular to the contact normal.
      const contactNormal = sweep.hits[0].normal;
      const remainingDot = dot(remaining, contactNormal);
      if (remainingDot < 0) {
        // Remove the component of `remaining` along -contactNormal.
        remaining = sub(remaining, scale(contactNormal, remainingDot));
      }

      // If remaining is tiny, stop.
      if (length(remaining) < 1e-5) break;
      bounced++;
    }

    // -- 6. Update grounding (probe downward from hemisphere bottom).
    this._updateGrounding();

    // -- 7. If grounded, snap to floor and zero out downward velocity.
    // This prevents the "velocity keeps growing while position is stuck" bug:
    // when the capsule is resting on the floor, the collision system cancels
    // any downward movement each tick, but without zeroing velocity.y, gravity
    // keeps accumulating — leading to huge downward velocity the moment the
    // capsule walks off a ledge.
    if (this.grounded) {
      // Snap: move the capsule DOWN so the hemisphere bottom touches the floor.
      // (We only snap DOWN, never UP — this lets the capsule climb slopes
      // naturally without being yanked up to a higher surface.)
      const capsuleHemisphereBottomY = this.position.y - half - this.radius;
      const snapDelta = this.groundY - capsuleHemisphereBottomY;
      if (snapDelta <= GROUND_SNAP_THRESHOLD && snapDelta >= -GROUND_SNAP_THRESHOLD) {
        this.position.y += snapDelta;
      }
      // Zero out downward velocity (we're resting).
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    // -- 8. Track distance traveled (horizontal only).
    const stepDist = Math.sqrt(
      (this.position.x - prevState.position.x) ** 2 +
      (this.position.z - prevState.position.z) ** 2,
    );
    if (Number.isFinite(stepDist)) {
      this.distanceTraveled += stepDist;
    }

    // -- 9. Update checkpoints.
    this._updateCheckpoints();

    // -- 10. Record trajectory.
    if (this.tick % TRAJECTORY_SAMPLE_INTERVAL === 0) {
      this.trajectory.push(this.position.x, this.position.y, this.position.z);
    }

    // -- 11. NaN guard.
    if (hasNaN(this.position) || hasNaN(this.velocity)) {
      // Restore previous state to prevent NaN propagation.
      this.setState(prevState);
      // Zero out velocity to prevent re-trigger.
      this.velocity = { x: 0, y: 0, z: 0 };
    }

    this.tick++;
  }

  /**
   * Push the capsule out of any triangles it's currently overlapping.
   * Returns whether any push was applied.
   */
  private _resolveOverlaps(): { pushed: boolean } {
    const { top, bottom } = this.getCapsuleSegment();
    const hits = queryCapsule(this.bvh, top, bottom, this.radius, SKIN_WIDTH);
    if (hits.length === 0) return { pushed: false };

    // Accumulate push directions from all hits (weighted by penetration).
    let pushX = 0, pushY = 0, pushZ = 0;
    for (const hit of hits) {
      if (hit.penetration <= 0) continue;
      pushX += hit.normal.x * hit.penetration;
      pushY += hit.normal.y * hit.penetration;
      pushZ += hit.normal.z * hit.penetration;
    }
    if (pushX === 0 && pushY === 0 && pushZ === 0) {
      return { pushed: false };
    }

    // Normalize the accumulated push by hit count to avoid over-correction.
    const n = hits.length;
    this.position.x += pushX / n;
    this.position.y += pushY / n;
    this.position.z += pushZ / n;
    return { pushed: true };
  }

  // --------------------------------------------------------------------------
  // Checkpoints
  // --------------------------------------------------------------------------

  /**
   * Define the ordered checkpoints along the tunnel spline.
   * Pass 5 checkpoints (entrance, interior-1, midpoint, interior-2, exit).
   * Resets all checkpoint reached state.
   */
  setCheckpoints(checkpoints: { t: number; position: Vec3 }[]): void {
    this.checkpoints = checkpoints.map(c => ({
      t: c.t,
      position: clone(c.position),
      cumulativeDistance: 0,
      reachedTick: -1,
    }));
  }

  /**
   * Check if any unreached checkpoints are now within `threshold` of the
   * capsule's horizontal position. If so, mark them reached.
   */
  private _updateCheckpoints(): void {
    const threshold = this.radius + 0.5; // generous: player walks through checkpoint zone
    for (const cp of this.checkpoints) {
      if (cp.reachedTick >= 0) continue;
      const dx = this.position.x - cp.position.x;
      const dy = this.position.y - cp.position.y;
      const dz = this.position.z - cp.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= threshold * threshold) {
        cp.reachedTick = this.tick;
        cp.cumulativeDistance = this.distanceTraveled;
      }
    }
  }

  /**
   * Get the current checkpoint progress.
   * Returns reached/total, the positions of reached checkpoints, total
   * distance traveled, and a SHA-256 hex hash of the recorded trajectory.
   */
  getCheckpointProgress(): CheckpointProgress {
    const reached = this.checkpoints.filter(c => c.reachedTick >= 0);
    const trajectoryHash = hashTrajectory(this.trajectory);
    return {
      reached: reached.length,
      total: this.checkpoints.length,
      positions: reached.map(c => clone(c.position)),
      distanceTraveled: this.distanceTraveled,
      trajectoryHash,
    };
  }

  /** Get a snapshot of all checkpoints (for inspection / UI). */
  getCheckpoints(): CheckpointRecord[] {
    return this.checkpoints.map(c => ({
      t: c.t,
      position: clone(c.position),
      cumulativeDistance: c.cumulativeDistance,
      reachedTick: c.reachedTick,
    }));
  }

  /** Get the raw trajectory as a flat Float32Array. */
  getTrajectory(): Float32Array {
    return new Float32Array(this.trajectory);
  }

  /**
   * Compute a "snapshot hash" — a deterministic SHA-256 hex of the entire
   * controller state. Used for replay verification across runs.
   */
  async snapshotHash(): Promise<string> {
    const state = this.getState();
    const data = encodeFloatsForHash([
      state.position.x, state.position.y, state.position.z,
      state.velocity.x, state.velocity.y, state.velocity.z,
      state.tick, state.distanceTraveled,
      this.grounded ? 1 : 0,
    ]);
    return hashString(data);
  }
}

// ============================================================================
// Trajectory hashing
// ============================================================================

/**
 * Hash the trajectory array (flat [x0,y0,z0, x1,y1,z1, ...]) deterministically.
 * Returns a SHA-256 hex string. Empty trajectory hashes to a known constant.
 *
 * Uses @noble/hashes (pure JS, deterministic, no secure-context requirement).
 */
export function hashTrajectory(trajectory: number[]): string {
  if (trajectory.length === 0) {
    return hashString('empty-trajectory-v1');
  }
  const encoded = encodeFloatsForHash(trajectory);
  return hashString('trajectory-v1:' + encoded);
}

/** Hash a UTF-8 string with SHA-256, return hex. */
export function hashString(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const hashBytes = nobleSha256(bytes);
  let hex = '';
  for (let i = 0; i < hashBytes.length; i++) {
    hex += hashBytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
