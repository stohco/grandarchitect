/**
 * PhysicsRuntime — Authoritative Physics Service
 * ================================================
 *
 * Per the auditor's directive:
 *
 *   "Physics must not live in React state. A dedicated runtime service
 *    should own: Rapier world, body/collider handles, input snapshot,
 *    fixed timestep, previous/current transforms, contact state,
 *    event queues, lifecycle, disposal."
 *
 * This is that service. It is a plain TypeScript class — NOT a React
 * component, NOT a hook, NOT connected to React state in any way.
 *
 * Lifecycle:
 *   initialize() → start() → [step loop] → pause() / resume() → reset() / dispose()
 *
 * The render loop reads interpolated snapshots. It does not trigger React
 * state updates every physics frame.
 */

import type * as THREE from 'three';

// ---------------------------------------------------------------------------
// Physics Constants
// ---------------------------------------------------------------------------

const PHYSICS_DT = 1 / 60; // 60 Hz fixed timestep
const MAX_SUBSTEPS = 4; // Cap catch-up to prevent spiral of death
const GRAVITY = { x: 0, y: -9.81, z: 0 };

// Character capsule dimensions (in meters)
const CHARACTER_RADIUS = 0.4;
const CHARACTER_HALF_HEIGHT = 0.9; // Rapier capsule half-height (cylinder part)
const CHARACTER_TOTAL_HEIGHT = CHARACTER_HALF_HEIGHT * 2 + CHARACTER_RADIUS * 2; // 2.6m total

// Movement parameters
const WALK_SPEED = 4.0; // m/s
const SPRINT_SPEED = 8.0; // m/s
const JUMP_VELOCITY = 6.0; // m/s upward
const ACCELERATION = 20.0; // m/s²
const DECELERATION = 15.0; // m/s²
const AIR_CONTROL = 0.3; // fraction of ground control in air

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhysicsSnapshot {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  grounded: boolean;
  verticalVelocity: number;
  horizontalVelocity: { x: number; z: number };
  movementMode: 'idle' | 'walking' | 'sprinting' | 'falling' | 'jumping';
  slopeAngle: number;
}

export interface CharacterIntent {
  moveX: number; // -1 to 1 (left/right)
  moveZ: number; // -1 to 1 (forward/backward)
  cameraYaw: number; // radians
  sprint: boolean;
  jump: boolean;
}

export interface ColliderDebugInfo {
  colliderId: number;
  type: 'cuboid' | 'cylinder' | 'capsule' | 'heightfield' | 'compound';
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  entityId?: number;
  label: string;
}

export interface PhysicsDiagnostics {
  stepCount: number;
  droppedSubsteps: number;
  frameDelta: number;
  accumulator: number;
  bodyCount: number;
  colliderCount: number;
  terrainRevision: number;
  structureRevision: number;
  isRunning: boolean;
}

// ---------------------------------------------------------------------------
// PhysicsRuntime Service
// ---------------------------------------------------------------------------

export class PhysicsRuntime {
  private Rapier: any = null;
  private world: any = null;
  private eventQueue: any = null;
  private characterController: any = null;
  private characterBody: any = null;
  private characterCollider: any = null;

  private bodies = new Map<number, { body: any; entityId: number; type: string }>();
  private colliders = new Map<number, ColliderDebugInfo>();
  private nextBodyId = 0;
  private nextColliderId = 0;

  // Fixed timestep accumulator
  private accumulator = 0;
  private stepCount = 0;
  private droppedSubsteps = 0;
  private lastFrameDelta = 0;

  // Snapshots for interpolation
  private previousSnapshot: PhysicsSnapshot | null = null;
  private currentSnapshot: PhysicsSnapshot | null = null;

  // Character state
  private characterState: PhysicsSnapshot = {
    position: { x: 0, y: 5, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    grounded: false,
    verticalVelocity: 0,
    horizontalVelocity: { x: 0, z: 0 },
    movementMode: 'falling',
    slopeAngle: 0,
  };

  // Terrain and structure revisions
  private terrainRevision = 0;
  private structureRevision = 0;

  // Lifecycle state
  private _ready = false;
  private _running = false;
  private _disposed = false;
  private _error: string | null = null;

  // Evidence claims (for CapabilityEvidenceManifest)
  private evidence: Set<string> = new Set();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  get ready(): boolean { return this._ready; }
  get running(): boolean { return this._running; }
  get disposed(): boolean { return this._disposed; }
  get error(): string | null { return this._error; }

  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this._ready) return;
    if (this._disposed) throw new Error('Cannot initialize disposed PhysicsRuntime');
    // Prevent duplicate init calls — return the existing promise if init
    // is already in progress.
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    if (this._ready) return;

    try {
      // Use the compat package — it worked before with the old hook.
      // The webpack --webpack flag + asyncWebAssembly experiment should
      // allow the WASM to load properly.
      const mod = await import('@dimforge/rapier3d-compat');
      this.Rapier = (mod as any).default ?? mod;
      await this.Rapier.init();

      this.world = new this.Rapier.World(GRAVITY);
      this.eventQueue = new this.Rapier.EventQueue(true);

      // Create the kinematic character controller.
      this.characterController = this.world.createCharacterController(0.01);
      this.characterController.setUp({ x: 0, y: 1, z: 0 });
      this.characterController.setApplyImpulsesToDynamicBodies(true);
      this.characterController.enableAutostep(0.5, 0.2, true);
      this.characterController.enableSnapToGround(0.5);
      this.characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180);
      this.characterController.setMinSlopeSlideAngle(30 * Math.PI / 180);

      this._ready = true;
      this.evidence.add('module-import');
      this.evidence.add('world-created');
      this.evidence.add('character-controller-created');
    } catch (err) {
      this._error = (err as Error).message;
      throw err;
    }
  }

  start(): void {
    if (!this._ready) throw new Error('PhysicsRuntime not initialized');
    this._running = true;
  }

  pause(): void {
    this._running = false;
  }

  resume(): void {
    if (!this._ready) throw new Error('PhysicsRuntime not initialized');
    this._running = true;
  }

  reset(): void {
    this.accumulator = 0;
    this.stepCount = 0;
    this.droppedSubsteps = 0;
    this.previousSnapshot = null;
    this.currentSnapshot = null;
    this.characterState = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      grounded: false,
      verticalVelocity: 0,
      horizontalVelocity: { x: 0, z: 0 },
      movementMode: 'falling',
      slopeAngle: 0,
    };
  }

  dispose(): void {
    if (this._disposed) return;
    this._running = false;
    this.bodies.clear();
    this.colliders.clear();
    if (this.world) {
      try { this.world.free(); } catch {}
      this.world = null;
    }
    this._disposed = true;
    this._ready = false;
  }

  // ---------------------------------------------------------------------------
  // Character Controller
  // ---------------------------------------------------------------------------

  createCharacter(position: { x: number; y: number; z: number }): void {
    if (!this._ready || !this.Rapier || !this.world) return;

    // Use a KINEMATIC body for the character controller.
    // Per auditor: "Use a kinematic controller initially for normal embodied
    // movement. Reserve dynamic bodies for ragdolls, knockback, debris."
    const bodyDesc = this.Rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    this.characterBody = this.world.createRigidBody(bodyDesc);

    const colliderDesc = this.Rapier.ColliderDesc.capsule(
      CHARACTER_HALF_HEIGHT,
      CHARACTER_RADIUS,
    );
    this.characterCollider = this.world.createCollider(colliderDesc, this.characterBody);

    this.characterState.position = { ...position };
    this.evidence.add('character-created');
  }

  /**
   * Process character intent and produce movement.
   *
   * Per auditor: "Input Sampling → Character Intent → Rapier Kinematic
   * Character Controller → Resolved movement and contacts → Authoritative
   * physics snapshot → Interpolated render transform → Camera follow"
   */
  applyCharacterIntent(intent: CharacterIntent): void {
    if (!this._ready || !this.characterBody || !this.characterController) return;

    // Calculate desired movement in world space (camera-relative).
    const cos = Math.cos(intent.cameraYaw);
    const sin = Math.sin(intent.cameraYaw);

    // Transform input by camera yaw.
    // Forward is -Z in camera space, so moveZ=1 means forward.
    const worldX = intent.moveX * cos + intent.moveZ * sin;
    const worldZ = -intent.moveX * sin + intent.moveZ * cos;

    // Calculate target horizontal velocity.
    const targetSpeed = intent.sprint ? SPRINT_SPEED : WALK_SPEED;
    const targetVx = worldX * targetSpeed;
    const targetVz = worldZ * targetSpeed;

    // Apply acceleration/deceleration.
    const accel = this.characterState.grounded ? ACCELERATION : ACCELERATION * AIR_CONTROL;
    const decel = this.characterState.grounded ? DECELERATION : DECELERATION * AIR_CONTROL;

    const currentVx = this.characterState.horizontalVelocity.x;
    const currentVz = this.characterState.horizontalVelocity.z;

    let newVx = currentVx;
    let newVz = currentVz;

    if (targetVx > currentVx) {
      newVx = Math.min(currentVx + accel * PHYSICS_DT, targetVx);
    } else if (targetVx < currentVx) {
      newVx = Math.max(currentVx - decel * PHYSICS_DT, targetVx);
    }

    if (targetVz > currentVz) {
      newVz = Math.min(currentVz + accel * PHYSICS_DT, targetVz);
    } else if (targetVz < currentVz) {
      newVz = Math.max(currentVz - decel * PHYSICS_DT, targetVz);
    }

    this.characterState.horizontalVelocity.x = newVx;
    this.characterState.horizontalVelocity.z = newVz;

    // Handle jump.
    if (intent.jump && this.characterState.grounded) {
      this.characterState.verticalVelocity = JUMP_VELOCITY;
      this.characterState.grounded = false;
      this.characterState.movementMode = 'jumping';
    }

    // Apply gravity if not grounded.
    if (!this.characterState.grounded) {
      this.characterState.verticalVelocity += GRAVITY.y * PHYSICS_DT;
    }

    // Compute desired displacement for this step.
    const desiredDisplacement = {
      x: newVx * PHYSICS_DT,
      y: this.characterState.verticalVelocity * PHYSICS_DT,
      z: newVz * PHYSICS_DT,
    };

    // Use Rapier's character controller to compute movement with collision.
    try {
      this.characterController.computeColliderMovement(
        this.characterCollider,
        desiredDisplacement,
      );

      const corrected = this.characterController.computedMovement();
      const newPos = this.characterBody.translation();

      const finalPos = {
        x: newPos.x + corrected.x,
        y: newPos.y + corrected.y,
        z: newPos.z + corrected.z,
      };

      this.characterBody.setNextKinematicTranslation(finalPos);
      this.characterState.position = finalPos;

      // Check grounded state.
      const grounded = this.characterController.computedGrounded();
      this.characterState.grounded = grounded;

      if (grounded && this.characterState.verticalVelocity < 0) {
        this.characterState.verticalVelocity = 0;
      }

      // Update movement mode.
      if (!grounded) {
        this.characterState.movementMode =
          this.characterState.verticalVelocity > 0.1 ? 'jumping' : 'falling';
      } else if (Math.abs(newVx) > 0.1 || Math.abs(newVz) > 0.1) {
        this.characterState.movementMode = intent.sprint ? 'sprinting' : 'walking';
      } else {
        this.characterState.movementMode = 'idle';
      }

      // Slope angle.
      this.characterState.slopeAngle = this.characterController.computedSlopeAngle() ?? 0;

      this.evidence.add('character-moved');
      if (grounded) this.evidence.add('character-grounded');
      if (intent.jump && grounded) this.evidence.add('character-jumped');
    } catch (err) {
      // Character controller may fail on first step.
    }
  }

  // ---------------------------------------------------------------------------
  // Fixed Timestep Simulation
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by frameDelta seconds using fixed timestep.
   *
   * Per auditor: "Use a fixed 60 Hz simulation step with an accumulator
   * and capped catch-up."
   */
  step(frameDelta: number, intent?: CharacterIntent): void {
    if (!this._ready || !this._running) return;

    this.lastFrameDelta = frameDelta;
    this.accumulator += Math.min(frameDelta, 0.1); // Cap to prevent spiral

    let steps = 0;

    while (this.accumulator >= PHYSICS_DT && steps < MAX_SUBSTEPS) {
      // Save previous snapshot.
      this.previousSnapshot = this.currentSnapshot
        ? { ...this.currentSnapshot }
        : null;

      // Apply character intent (if provided).
      if (intent) {
        this.applyCharacterIntent(intent);
      }

      // Step the Rapier world.
      try {
        this.world.step(this.eventQueue);
      } catch {
        // World may not be fully initialized.
      }

      // Capture current snapshot.
      this.currentSnapshot = this.captureSnapshot();

      this.accumulator -= PHYSICS_DT;
      steps++;
      this.stepCount++;
    }

    // Track dropped substeps (couldn't catch up).
    if (this.accumulator >= PHYSICS_DT) {
      this.droppedSubsteps++;
      this.accumulator = 0; // Reset to prevent accumulation
    }
  }

  private captureSnapshot(): PhysicsSnapshot {
    return {
      position: { ...this.characterState.position },
      rotation: { ...this.characterState.rotation },
      grounded: this.characterState.grounded,
      verticalVelocity: this.characterState.verticalVelocity,
      horizontalVelocity: { ...this.characterState.horizontalVelocity },
      movementMode: this.characterState.movementMode,
      slopeAngle: this.characterState.slopeAngle,
    };
  }

  /**
   * Get interpolated snapshot for rendering.
   * Alpha is the fraction between previous and current.
   */
  getInterpolatedSnapshot(): PhysicsSnapshot | null {
    if (!this.currentSnapshot) return null;
    if (!this.previousSnapshot) return this.currentSnapshot;

    const alpha = this.accumulator / PHYSICS_DT;
    const a = Math.max(0, Math.min(1, alpha));

    return {
      position: {
        x: this.lerp(this.previousSnapshot.position.x, this.currentSnapshot.position.x, a),
        y: this.lerp(this.previousSnapshot.position.y, this.currentSnapshot.position.y, a),
        z: this.lerp(this.previousSnapshot.position.z, this.currentSnapshot.position.z, a),
      },
      rotation: this.currentSnapshot.rotation, // Rotation doesn't need interpolation for now
      grounded: this.currentSnapshot.grounded,
      verticalVelocity: this.currentSnapshot.verticalVelocity,
      horizontalVelocity: { ...this.currentSnapshot.horizontalVelocity },
      movementMode: this.currentSnapshot.movementMode,
      slopeAngle: this.currentSnapshot.slopeAngle,
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  // ---------------------------------------------------------------------------
  // Collider Creation (Shape-Aware)
  // ---------------------------------------------------------------------------

  /**
   * Add a heightfield collider for terrain.
   * Per auditor: "use a heightfield collider for the current surface terrain"
   */
  addTerrainHeightfield(
    heights: Float32Array,
    scale: { x: number; z: number },
    revision: number,
  ): number | null {
    if (!this._ready || !this.Rapier || !this.world) return null;

    const nrows = Math.sqrt(heights.length);
    const ncols = nrows;

    const colliderDesc = this.Rapier.ColliderDesc.heightfield(
      nrows,
      ncols,
      heights,
      { x: scale.x, y: 1, z: scale.z },
    );

    const bodyDesc = this.Rapier.RigidBodyDesc.fixed();
    const body = this.world.createRigidBody(bodyDesc);
    const collider = this.world.createCollider(colliderDesc, body);

    const id = ++this.nextColliderId;
    this.colliders.set(id, {
      colliderId: id,
      type: 'heightfield',
      position: { x: 0, y: 0, z: 0 },
      size: { x: scale.x, y: 0, z: scale.z },
      label: `Terrain heightfield (rev ${revision})`,
    });
    this.terrainRevision = revision;
    this.evidence.add('terrain-heightfield-created');
    return id;
  }

  /**
   * Add a static cuboid collider (for walls, rectangular buildings).
   */
  addCuboidCollider(
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    entityId?: number,
    label?: string,
  ): number | null {
    if (!this._ready || !this.Rapier || !this.world) return null;

    const bodyDesc = this.Rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
    this.world.createCollider(colliderDesc, body);

    const id = ++this.nextColliderId;
    this.colliders.set(id, {
      colliderId: id,
      type: 'cuboid',
      position: { ...position },
      size: { ...size },
      entityId,
      label: label ?? `Cuboid ${id}`,
    });
    this.structureRevision++;
    this.evidence.add('cuboid-collider-created');
    return id;
  }

  /**
   * Add a static cylinder collider (for wells, columns, round structures).
   */
  addCylinderCollider(
    position: { x: number; y: number; z: number },
    radius: number,
    height: number,
    entityId?: number,
    label?: string,
  ): number | null {
    if (!this._ready || !this.Rapier || !this.world) return null;

    const bodyDesc = this.Rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.cylinder(height / 2, radius);
    this.world.createCollider(colliderDesc, body);

    const id = ++this.nextColliderId;
    this.colliders.set(id, {
      colliderId: id,
      type: 'cylinder',
      position: { ...position },
      size: { x: radius * 2, y: height, z: radius * 2 },
      entityId,
      label: label ?? `Cylinder ${id}`,
    });
    this.structureRevision++;
    this.evidence.add('cylinder-collider-created');
    return id;
  }

  /**
   * Add a static capsule collider (for columns, pillars).
   */
  addCapsuleCollider(
    position: { x: number; y: number; z: number },
    radius: number,
    height: number,
    entityId?: number,
    label?: string,
  ): number | null {
    if (!this._ready || !this.Rapier || !this.world) return null;

    const bodyDesc = this.Rapier.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.Rapier.ColliderDesc.capsule(height / 2, radius);
    this.world.createCollider(colliderDesc, body);

    const id = ++this.nextColliderId;
    this.colliders.set(id, {
      colliderId: id,
      type: 'capsule',
      position: { ...position },
      size: { x: radius * 2, y: height, z: radius * 2 },
      entityId,
      label: label ?? `Capsule ${id}`,
    });
    this.structureRevision++;
    return id;
  }

  // ---------------------------------------------------------------------------
  // Shape-Aware Structure Colliders
  // ---------------------------------------------------------------------------

  /**
   * Create the correct collider shape based on structure kind.
   * Per auditor: "Use semantic collider rules: cuboid, cylinder, capsule,
   * compound, trimesh only where justified"
   */
  addStructureCollider(
    kind: string,
    position: { x: number; z: number },
    width: number,
    depth: number,
    entityId: number,
    name: string,
  ): number | null {
    const KIND_HEIGHTS: Record<string, number> = {
      lineage_hall: 6, household: 3.5, well: 1.5, threshing_ground: 0.3,
      mill: 4, spirit_shrine: 5, dock: 1, path: 0.1, paddy: 0.2,
      dryland_garden: 0.4, graveyard: 1, levee: 2,
    };

    const height = KIND_HEIGHTS[kind] ?? 2;

    switch (kind) {
      case 'well':
        // Well is round → cylinder collider
        return this.addCylinderCollider(
          { x: position.x, y: height / 2, z: position.z },
          Math.max(width, depth) / 2,
          height,
          entityId,
          `Well: ${name}`,
        );

      case 'mill':
        // Mill has a circular base → cylinder
        return this.addCylinderCollider(
          { x: position.x, y: height / 2, z: position.z },
          Math.max(width, depth) / 2,
          height,
          entityId,
          `Mill: ${name}`,
        );

      case 'spirit_shrine':
        // Shrine is a cone/compound shape → use cylinder for base
        return this.addCylinderCollider(
          { x: position.x, y: height / 2, z: position.z },
          Math.max(width, depth) / 2,
          height,
          entityId,
          `Shrine: ${name}`,
        );

      case 'lineage_hall':
        // Hall is rectangular → cuboid
        return this.addCuboidCollider(
          { x: position.x, y: height / 2, z: position.z },
          { x: width, y: height, z: depth },
          entityId,
          `Hall: ${name}`,
        );

      case 'household':
        // Household is rectangular → cuboid
        return this.addCuboidCollider(
          { x: position.x, y: height / 2, z: position.z },
          { x: width, y: height, z: depth },
          entityId,
          `Household: ${name}`,
        );

      case 'dock':
        // Dock is flat → thin cuboid
        return this.addCuboidCollider(
          { x: position.x, y: height / 2, z: position.z },
          { x: width, y: height, z: depth },
          entityId,
          `Dock: ${name}`,
        );

      case 'levee':
        // Levee is a long wall → cuboid
        return this.addCuboidCollider(
          { x: position.x, y: height / 2, z: position.z },
          { x: width, y: height, z: depth },
          entityId,
          `Levee: ${name}`,
        );

      default:
        // Default: cuboid
        if (height < 0.5) {
          // Flat structures (path, paddy, threshing_ground) — skip collider
          return null;
        }
        return this.addCuboidCollider(
          { x: position.x, y: height / 2, z: position.z },
          { x: width, y: height, z: depth },
          entityId,
          `${kind}: ${name}`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  getDiagnostics(): PhysicsDiagnostics {
    return {
      stepCount: this.stepCount,
      droppedSubsteps: this.droppedSubsteps,
      frameDelta: this.lastFrameDelta,
      accumulator: this.accumulator,
      bodyCount: this.bodies.size,
      colliderCount: this.colliders.size,
      terrainRevision: this.terrainRevision,
      structureRevision: this.structureRevision,
      isRunning: this._running,
    };
  }

  getColliderDebugInfo(): ColliderDebugInfo[] {
    return Array.from(this.colliders.values());
  }

  getEvidence(): string[] {
    return Array.from(this.evidence);
  }

  getCharacterSnapshot(): PhysicsSnapshot | null {
    return this.getInterpolatedSnapshot();
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let runtime: PhysicsRuntime | null = null;

export function getPhysicsRuntime(): PhysicsRuntime {
  if (!runtime) {
    runtime = new PhysicsRuntime();
  }
  return runtime;
}

export function resetPhysicsRuntime(): void {
  if (runtime) {
    runtime.dispose();
    runtime = null;
  }
}
