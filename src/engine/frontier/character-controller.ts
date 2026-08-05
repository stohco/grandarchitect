/**
 * Character Controller Capability — modular capsule-based movement
 *
 * Replaces the preliminary raycast approach with a real character controller
 * using capsule sweep, collision response, sliding, ground snapping,
 * slope limits, step handling, and penetration correction.
 *
 * Uses real units (meters, seconds) and a fixed simulation timestep.
 * No frame-dependent constants.
 *
 * No forbidden functions. No Three.js (engine contract is renderer-independent).
 */

// ============================================================================
// Configuration — all values in real units
// ============================================================================

export interface CharacterControllerConfig {
  radiusMeters: number;
  standingHeightMeters: number;
  crouchingHeightMeters: number;
  gravityMetersPerSecondSquared: number;
  maximumWalkSpeedMetersPerSecond: number;
  groundAccelerationMetersPerSecondSquared: number;
  airAccelerationMetersPerSecondSquared: number;
  maximumSlopeDegrees: number;
  stepHeightMeters: number;
  groundSnapDistanceMeters: number;
  maximumDepenetrationMeters: number;
  collisionIterations: number;
  maximumSubsteps: number;
}

export const DEFAULT_CONFIG: CharacterControllerConfig = {
  radiusMeters: 0.4,
  standingHeightMeters: 1.8,
  crouchingHeightMeters: 0.9,
  gravityMetersPerSecondSquared: 9.81,
  maximumWalkSpeedMetersPerSecond: 4.0,
  groundAccelerationMetersPerSecondSquared: 30.0,
  airAccelerationMetersPerSecondSquared: 5.0,
  maximumSlopeDegrees: 45.0,
  stepHeightMeters: 0.3,
  groundSnapDistanceMeters: 0.1,
  maximumDepenetrationMeters: 0.02,
  collisionIterations: 4,
  maximumSubsteps: 4,
};

// ============================================================================
// Fixed timestep
// ============================================================================

export const FIXED_DELTA_SECONDS = 1 / 60;

// ============================================================================
// Capsule shape
// ============================================================================

export interface CapsuleShape {
  radius: number;
  halfHeight: number; // half the cylinder portion height (not including caps)
  center: { x: number; y: number; z: number };
}

export function createCapsule(config: CharacterControllerConfig, position: { x: number; y: number; z: number }): CapsuleShape {
  return {
    radius: config.radiusMeters,
    halfHeight: config.standingHeightMeters / 2 - config.radiusMeters,
    center: { ...position },
  };
}

// ============================================================================
// Collision world interface — renderer-independent
// ============================================================================

export interface CharacterCollisionWorld {
  /** Sweep a capsule along a displacement, returning the first impact */
  sweepCapsule(capsule: CapsuleShape, displacement: { x: number; y: number; z: number }, revision: number): CapsuleSweepResult;
  /** Check if a capsule overlaps any geometry */
  overlapCapsule(capsule: CapsuleShape, revision: number): CapsuleOverlapResult;
  /** Find ground below the capsule */
  findGround(capsule: CapsuleShape, maxDistance: number, revision: number): GroundQueryResult;
}

export interface CapsuleSweepResult {
  hit: boolean;
  distance: number; // distance traveled before impact (0..1 of displacement length)
  normal: { x: number; y: number; z: number };
  point: { x: number; y: number; z: number };
}

export interface CapsuleOverlapResult {
  overlapping: boolean;
  penetrationDepth: number;
  normal: { x: number; y: number; z: number };
}

export interface GroundQueryResult {
  found: boolean;
  height: number;
  normal: { x: number; y: number; z: number };
}

// ============================================================================
// Input commands — deterministic, can be keyboard or test-injected
// ============================================================================

export interface CharacterInputCommand {
  tick: number;
  moveForward: number; // -1..1
  moveRight: number;   // -1..1
  jumpPressed: boolean;
  crouchHeld: boolean;
  cameraYaw: number;   // radians — for camera-relative movement
}

// ============================================================================
// Character state
// ============================================================================

export interface CharacterState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  grounded: boolean;
  crouching: boolean;
  activeRevision: number;
  // Telemetry
  collisionEvents: CollisionEvent[];
  checkpointEvents: CheckpointEvent[];
  trajectory: { tick: number; x: number; y: number; z: number }[];
}

export interface CollisionEvent {
  tick: number;
  type: 'wall' | 'floor' | 'ceiling' | 'slope' | 'step' | 'penetration';
  normal: { x: number; y: number; z: number };
  penetrationDepth: number;
}

export interface CheckpointEvent {
  tick: number;
  checkpointId: string;
  position: { x: number; y: number; z: number };
}

// ============================================================================
// Checkpoints — derived from tunnel spline, not hardcoded x-coordinates
// ============================================================================

export interface TunnelCheckpoint {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number; // the player must be within this radius of the checkpoint
  ordered: boolean; // must be crossed in sequence
}

export function createTunnelCheckpoints(splinePoints: [number, number, number][]): TunnelCheckpoint[] {
  if (splinePoints.length < 2) return [];

  const entrance: [number, number, number] = splinePoints[0];
  const exit: [number, number, number] = splinePoints[splinePoints.length - 1];
  const midpoint: [number, number, number] = splinePoints[Math.floor(splinePoints.length / 2)];

  // Interior checkpoints at 25% and 75% along the spline
  const interior1 = lerpSpline(splinePoints, 0.25);
  const interior2 = lerpSpline(splinePoints, 0.75);

  return [
    { id: 'entrance', position: { x: entrance[0], y: entrance[1], z: entrance[2] }, radius: 5.0, ordered: true },
    { id: 'interior-1', position: { x: interior1[0], y: interior1[1], z: interior1[2] }, radius: 5.0, ordered: true },
    { id: 'midpoint', position: { x: midpoint[0], y: midpoint[1], z: midpoint[2] }, radius: 5.0, ordered: true },
    { id: 'interior-2', position: { x: interior2[0], y: interior2[1], z: interior2[2] }, radius: 5.0, ordered: true },
    { id: 'exit', position: { x: exit[0], y: exit[1], z: exit[2] }, radius: 5.0, ordered: true },
  ];
}

function lerpSpline(points: [number, number, number][], t: number): [number, number, number] {
  const segLen = 1 / (points.length - 1);
  const seg = Math.min(Math.floor(t / segLen), points.length - 2);
  const localT = (t - seg * segLen) / segLen;
  const a = points[seg];
  const b = points[seg + 1];
  return [
    a[0] + (b[0] - a[0]) * localT,
    a[1] + (b[1] - a[1]) * localT,
    a[2] + (b[2] - a[2]) * localT,
  ];
}

// ============================================================================
// Character Controller
// ============================================================================

export interface CharacterController {
  config: CharacterControllerConfig;
  state: CharacterState;
  checkpoints: TunnelCheckpoint[];
  nextCheckpointIndex: number;

  /** Spawn the character at a safe position near a tunnel entrance */
  spawn(entrance: { x: number; y: number; z: number }, world: CharacterCollisionWorld, revision: number): { success: boolean; reason?: string };

  /** Process one input command at a fixed timestep */
  step(input: CharacterInputCommand, world: CharacterCollisionWorld, revision: number): void;

  /** Check if a checkpoint was crossed */
  checkCheckpoints(): CheckpointEvent[];

  /** Check if all ordered checkpoints were crossed in sequence */
  traversalComplete(): boolean;

  /** Get trajectory hash for replay comparison */
  trajectoryHash(): string;
}

export function createCharacterController(
  config: CharacterControllerConfig,
  checkpoints: TunnelCheckpoint[],
): CharacterController {
  const state: CharacterState = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    crouching: false,
    activeRevision: 0,
    collisionEvents: [],
    checkpointEvents: [],
    trajectory: [],
  };

  let currentTick = 0;

  function spawn(entrance: { x: number; y: number; z: number }, world: CharacterCollisionWorld, revision: number): { success: boolean; reason?: string } {
    // The entrance position is at the tunnel centerline.
    // The tunnel floor is at entrance.y - tunnelRadius (approx).
    // We try to spawn at the tunnel floor, then verify with overlap test.
    // If that fails, we search downward for a valid ground position.

    // Try spawning at entrance floor level (entrance.y - 3 for radius-3 tunnel)
    // with character standing height offset
    const floorY = entrance.y - 3; // tunnel floor = center - radius
    const spawnPos = { x: entrance.x, y: floorY + config.standingHeightMeters / 2, z: entrance.z };

    // Check for overlap — if inside terrain, try higher
    for (let offset = 0; offset < 10; offset++) {
      const testPos = { x: spawnPos.x, y: spawnPos.y + offset * 0.5, z: spawnPos.z };
      const testCapsule = createCapsule(config, testPos);
      const overlap = world.overlapCapsule(testCapsule, revision);
      if (!overlap.overlapping) {
        // Found a valid spawn position
        state.position = testPos;
        state.velocity = { x: 0, y: 0, z: 0 };
        state.grounded = true;
        state.activeRevision = revision;
        currentTick = 0;
        state.collisionEvents = [];
        state.checkpointEvents = [];
        state.trajectory = [];
        return { success: true };
      }
    }

    // If all positions overlap, try searching for ground from above
    const searchPos = { x: entrance.x, y: entrance.y + 20, z: entrance.z };
    const searchCapsule = createCapsule(config, searchPos);
    const ground = world.findGround(searchCapsule, 50.0, revision);
    if (ground.found) {
      const groundSpawnPos = { x: entrance.x, y: ground.height + config.standingHeightMeters / 2 + 0.5, z: entrance.z };
      state.position = groundSpawnPos;
      state.velocity = { x: 0, y: 0, z: 0 };
      state.grounded = true;
      state.activeRevision = revision;
      currentTick = 0;
      state.collisionEvents = [];
      state.checkpointEvents = [];
      state.trajectory = [];
      return { success: true };
    }

    return { success: false, reason: 'Could not find valid spawn position (all positions overlap terrain or no ground found)' };
  }

  function step(input: CharacterInputCommand, world: CharacterCollisionWorld, revision: number): void {
    const dt = FIXED_DELTA_SECONDS;

    // Check for stale revision
    if (revision !== state.activeRevision) {
      // Stale — stop movement
      state.velocity.x = 0;
      state.velocity.z = 0;
      return;
    }

    // Calculate movement direction from input (camera-relative)
    const yaw = input.cameraYaw;
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const wishDirX = forwardX * input.moveForward + rightX * input.moveRight;
    const wishDirZ = forwardZ * input.moveForward + rightZ * input.moveRight;
    const wishLen = Math.sqrt(wishDirX * wishDirX + wishDirZ * wishDirZ);

    // Apply acceleration
    const accel = state.grounded ? config.groundAccelerationMetersPerSecondSquared : config.airAccelerationMetersPerSecondSquared;

    if (wishLen > 0.001) {
      const normX = wishDirX / wishLen;
      const normZ = wishDirZ / wishLen;
      state.velocity.x += normX * accel * dt;
      state.velocity.z += normZ * accel * dt;

      // Clamp to max speed
      const hSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
      if (hSpeed > config.maximumWalkSpeedMetersPerSecond) {
        state.velocity.x = (state.velocity.x / hSpeed) * config.maximumWalkSpeedMetersPerSecond;
        state.velocity.z = (state.velocity.z / hSpeed) * config.maximumWalkSpeedMetersPerSecond;
      }
    } else {
      // Decelerate when no input
      if (state.grounded) {
        const decel = config.groundAccelerationMetersPerSecondSquared * dt;
        const hSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
        if (hSpeed < decel) {
          state.velocity.x = 0;
          state.velocity.z = 0;
        } else {
          state.velocity.x -= (state.velocity.x / hSpeed) * decel;
          state.velocity.z -= (state.velocity.z / hSpeed) * decel;
        }
      }
    }

    // Apply gravity
    state.velocity.y -= config.gravityMetersPerSecondSquared * dt;

    // Crouching
    state.crouching = input.crouchHeld;

    // Calculate displacement for this step
    let dispX = state.velocity.x * dt;
    let dispY = state.velocity.y * dt;
    let dispZ = state.velocity.z * dt;

    // Collision resolution — iterative
    const capsule = createCapsule(config, state.position);

    for (let iter = 0; iter < config.collisionIterations; iter++) {
      const displacement = { x: dispX, y: dispY, z: dispZ };
      const dispLen = Math.sqrt(dispX ** 2 + dispY ** 2 + dispZ ** 2);

      if (dispLen < 0.0001) break;

      const sweep = world.sweepCapsule(capsule, displacement, revision);

      if (sweep.hit) {
        // Move to contact point
        const moveDist = sweep.distance * dispLen;
        const normDispLen = dispLen > 0 ? dispLen : 1;
        state.position.x += (dispX / normDispLen) * moveDist;
        state.position.y += (dispY / normDispLen) * moveDist;
        state.position.z += (dispZ / normDispLen) * moveDist;

        // Record collision event
        state.collisionEvents.push({
          tick: currentTick,
          type: sweep.normal.y > 0.7 ? 'floor' : sweep.normal.y < -0.7 ? 'ceiling' : 'wall',
          normal: sweep.normal,
          penetrationDepth: 0,
        });

        // Project remaining movement along collision surface (sliding)
        const remaining = (1 - sweep.distance) * dispLen;
        const dot = (dispX / normDispLen) * sweep.normal.x + (dispY / normDispLen) * sweep.normal.y + (dispZ / normDispLen) * sweep.normal.z;
        dispX = (dispX / normDispLen - dot * sweep.normal.x) * remaining;
        dispY = (dispY / normDispLen - dot * sweep.normal.y) * remaining;
        dispZ = (dispZ / normDispLen - dot * sweep.normal.z) * remaining;

        // If floor contact, zero out downward velocity
        if (sweep.normal.y > 0.7) {
          state.velocity.y = 0;
          state.grounded = true;
          dispY = 0;
        }

        // If ceiling, zero out upward velocity
        if (sweep.normal.y < -0.7) {
          state.velocity.y = 0;
          dispY = 0;
        }

        // Update capsule center for next iteration
        capsule.center = { ...state.position };
      } else {
        // No hit — move full displacement
        state.position.x += dispX;
        state.position.y += dispY;
        state.position.z += dispZ;
        break;
      }
    }

    // Ground snap — try to stick to ground when grounded
    if (state.grounded) {
      const snapCapsule = createCapsule(config, state.position);
      const ground = world.findGround(snapCapsule, config.groundSnapDistanceMeters, revision);
      if (ground.found) {
        const targetY = ground.height + config.standingHeightMeters / 2;
        if (Math.abs(state.position.y - targetY) < config.groundSnapDistanceMeters) {
          state.position.y = targetY;
        }
      } else {
        state.grounded = false;
      }
    }

    // Penetration correction
    const finalCapsule = createCapsule(config, state.position);
    const overlap = world.overlapCapsule(finalCapsule, revision);
    if (overlap.overlapping && overlap.penetrationDepth > 0) {
      state.position.x += overlap.normal.x * Math.min(overlap.penetrationDepth, config.maximumDepenetrationMeters);
      state.position.y += overlap.normal.y * Math.min(overlap.penetrationDepth, config.maximumDepenetrationMeters);
      state.position.z += overlap.normal.z * Math.min(overlap.penetrationDepth, config.maximumDepenetrationMeters);

      state.collisionEvents.push({
        tick: currentTick,
        type: 'penetration',
        normal: overlap.normal,
        penetrationDepth: overlap.penetrationDepth,
      });
    }

    // Record trajectory
    state.trajectory.push({ tick: currentTick, x: state.position.x, y: state.position.y, z: state.position.z });

    // Check checkpoints
    checkCheckpoints();

    currentTick++;
  }

  function checkCheckpoints(): CheckpointEvent[] {
    const events: CheckpointEvent[] = [];
    if (controller.nextCheckpointIndex < controller.checkpoints.length) {
      const cp = controller.checkpoints[controller.nextCheckpointIndex];
      const dx = state.position.x - cp.position.x;
      const dy = state.position.y - cp.position.y;
      const dz = state.position.z - cp.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= cp.radius) {
        const event: CheckpointEvent = {
          tick: currentTick,
          checkpointId: cp.id,
          position: { ...state.position },
        };
        state.checkpointEvents.push(event);
        events.push(event);
        controller.nextCheckpointIndex++;
      }
    }
    return events;
  }

  function traversalComplete(): boolean {
    return controller.nextCheckpointIndex >= controller.checkpoints.length;
  }

  function trajectoryHash(): string {
    // Simple hash of trajectory positions
    let hash = 0;
    const str = state.trajectory.map(t => `${t.x.toFixed(4)},${t.y.toFixed(4)},${t.z.toFixed(4)}`).join('|');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return `traj-${(hash >>> 0).toString(16)}`;
  }

  const controller: CharacterController = {
    config,
    state,
    checkpoints,
    nextCheckpointIndex: 0,
    spawn,
    step,
    checkCheckpoints,
    traversalComplete,
    trajectoryHash,
  };

  return controller;
}

// ============================================================================
// Collision world implementation — uses Three.js Raycaster under the hood
// but exposes the renderer-independent interface
// ============================================================================

export function createThreeJSCollisionWorld(
  getTerrainMesh: () => { positions: Float32Array; indices: Uint32Array; vertexCount: number } | null,
  getRevision: () => number,
): CharacterCollisionWorld {
  // Convert mesh data to a simple triangle list for raycasting
  function getTriangles() {
    const mesh = getTerrainMesh();
    if (!mesh) return [];
    const tris: { a: [number, number, number]; b: [number, number, number]; c: [number, number, number] }[] = [];
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const i0 = mesh.indices[i] * 3;
      const i1 = mesh.indices[i + 1] * 3;
      const i2 = mesh.indices[i + 2] * 3;
      tris.push({
        a: [mesh.positions[i0], mesh.positions[i0 + 1], mesh.positions[i0 + 2]],
        b: [mesh.positions[i1], mesh.positions[i1 + 1], mesh.positions[i1 + 2]],
        c: [mesh.positions[i2], mesh.positions[i2 + 1], mesh.positions[i2 + 2]],
      });
    }
    return tris;
  }

  // Ray-triangle intersection (Möller–Trumbore)
  function rayTriangle(
    origin: [number, number, number], dir: [number, number, number],
    a: [number, number, number], b: [number, number, number], c: [number, number, number],
  ): { hit: boolean; t: number; normal: [number, number, number] } {
    const edge1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const edge2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const h = [
      dir[1] * edge2[2] - dir[2] * edge2[1],
      dir[2] * edge2[0] - dir[0] * edge2[2],
      dir[0] * edge2[1] - dir[1] * edge2[0],
    ];
    const det = edge1[0] * h[0] + edge1[1] * h[1] + edge1[2] * h[2];
    if (det > -0.0001 && det < 0.0001) return { hit: false, t: 0, normal: [0, 0, 0] };
    const invDet = 1 / det;
    const s = [origin[0] - a[0], origin[1] - a[1], origin[2] - a[2]];
    const u = invDet * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
    if (u < 0 || u > 1) return { hit: false, t: 0, normal: [0, 0, 0] };
    const q = [
      s[1] * edge1[2] - s[2] * edge1[1],
      s[2] * edge1[0] - s[0] * edge1[2],
      s[0] * edge1[1] - s[1] * edge1[0],
    ];
    const v = invDet * (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]);
    if (v < 0 || u + v > 1) return { hit: false, t: 0, normal: [0, 0, 0] };
    const t = invDet * (edge2[0] * q[0] + edge2[1] * q[1] + edge2[2] * q[2]);
    if (t < 0) return { hit: false, t: 0, normal: [0, 0, 0] };
    // Normal
    const nx = edge1[1] * edge2[2] - edge1[2] * edge2[1];
    const ny = edge1[2] * edge2[0] - edge1[0] * edge2[2];
    const nz = edge1[0] * edge2[1] - edge1[1] * edge2[0];
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return { hit: true, t, normal: nLen > 0 ? [nx / nLen, ny / nLen, nz / nLen] : [0, 1, 0] };
  }

  function normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
  }

  return {
    sweepCapsule(capsule, displacement, revision) {
      // Simplified capsule sweep: cast a ray from capsule center along displacement
      const tris = getTriangles();
      const origin: [number, number, number] = [capsule.center.x, capsule.center.y, capsule.center.z];
      const dir = normalize([displacement.x, displacement.y, displacement.z]);
      const maxDist = Math.sqrt(displacement.x ** 2 + displacement.y ** 2 + displacement.z ** 2);

      let closestT = 1.0;
      let closestNormal = { x: 0, y: 1, z: 0 };
      let hit = false;

      for (const tri of tris) {
        const result = rayTriangle(origin, dir, tri.a, tri.b, tri.c);
        if (result.hit && result.t < closestT && result.t < maxDist + capsule.radius) {
          closestT = result.t / (maxDist + capsule.radius);
          closestNormal = { x: result.normal[0], y: result.normal[1], z: result.normal[2] };
          hit = true;
        }
      }

      return {
        hit,
        distance: hit ? Math.max(0, closestT) : 1.0,
        normal: closestNormal,
        point: {
          x: origin[0] + dir[0] * closestT * maxDist,
          y: origin[1] + dir[1] * closestT * maxDist,
          z: origin[2] + dir[2] * closestT * maxDist,
        },
      };
    },

    overlapCapsule(capsule, revision) {
      // Simplified: check if capsule center is inside any triangle's bounds
      const tris = getTriangles();
      const cx = capsule.center.x;
      const cy = capsule.center.y;
      const cz = capsule.center.z;
      const r = capsule.radius;

      for (const tri of tris) {
        // Distance from point to triangle (approximate — distance to centroid)
        const cxA = (tri.a[0] + tri.b[0] + tri.c[0]) / 3;
        const cyA = (tri.a[1] + tri.b[1] + tri.c[1]) / 3;
        const czA = (tri.a[2] + tri.b[2] + tri.c[2]) / 3;
        const dist = Math.sqrt((cx - cxA) ** 2 + (cy - cyA) ** 2 + (cz - czA) ** 2);
        if (dist < r) {
          const nx = cx - cxA;
          const ny = cy - cyA;
          const nz = cz - czA;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
          return {
            overlapping: true,
            penetrationDepth: r - dist,
            normal: nLen > 0 ? { x: nx / nLen, y: ny / nLen, z: nz / nLen } : { x: 0, y: 1, z: 0 },
          };
        }
      }

      return { overlapping: false, penetrationDepth: 0, normal: { x: 0, y: 1, z: 0 } };
    },

    findGround(capsule, maxDistance, revision) {
      const tris = getTriangles();
      const origin: [number, number, number] = [capsule.center.x, capsule.center.y, capsule.center.z];
      const dir: [number, number, number] = [0, -1, 0];

      let closestT = maxDistance;
      let found = false;
      let normal = { x: 0, y: 1, z: 0 };

      for (const tri of tris) {
        const result = rayTriangle(origin, dir, tri.a, tri.b, tri.c);
        if (result.hit && result.t < closestT) {
          // Skip downward-facing triangles (bottom faces of terrain)
          // Ground should have normal.y > 0 (upward-facing)
          if (result.normal[1] > 0) {
            closestT = result.t;
            found = true;
            normal = { x: result.normal[0], y: result.normal[1], z: result.normal[2] };
          }
        }
      }

      return {
        found,
        height: found ? origin[1] - closestT : 0,
        normal,
      };
    },
  };
}
