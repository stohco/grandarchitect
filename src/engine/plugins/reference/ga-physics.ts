/**
 * ga:physics — Physics Plugin
 *
 * Abstracts physics behind PhysicsApi. The real backend (Jolt/Box3D WASM) is
 * swappable without simulation changes. The headless stub provides a no-op
 * implementation for conformance testing.
 *
 * Capabilities provided:
 *   - physics.api: PhysicsApi — create/destroy bodies, raycast, shapecast, snapshot.
 *   - physics.materials: Physics material registry (friction, restitution per realm).
 */

import type { Plugin, PluginHost } from '../../kernel/plugin-host';
import type { PluginManifest } from '../../kernel/types';

// ============================================================================
// Physics Types (from architecture doc 20)
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export type ShapeRole =
  | 'simulation'
  | 'query'
  | 'character_controller'
  | 'rigid_body'
  | 'trigger'
  | 'navigation_obstacle'
  | 'terrain_collider'
  | 'hit_detection'
  | 'visual_geometry';

export type BodyType = 'static' | 'kinematic' | 'dynamic';

export interface BodySpec {
  bodyType: BodyType;
  transform: Transform;
  shape?: ShapeSpec;
  mass?: number;
  friction?: number;
  restitution?: number;
  collisionLayer?: number;
  collisionMask?: number;
  linearDamping?: number;
  angularDamping?: number;
  isSensor?: boolean;
  userData?: Record<string, unknown>;
}

export type ShapeSpec =
  | { type: 'sphere'; radius: number }
  | { type: 'box'; halfExtents: Vec3 }
  | { type: 'capsule'; radius: number; height: number }
  | { type: 'cylinder'; radius: number; height: number }
  | { type: 'convex-hull'; points: Vec3[] }
  | { type: 'triangle-mesh'; vertices: Vec3[]; indices: number[] }
  | { type: 'heightfield'; heights: Float32Array; scale: Vec3; min: Vec3; max: Vec3 };

export interface PhysicsBodyHandle {
  id: string;
  valid: boolean;
}

export interface ContactInfo {
  otherBody: PhysicsBodyHandle;
  point: Vec3;
  normal: Vec3;
  penetration: number;
}

export interface CollisionFilter {
  layerMask?: number;
  groupMask?: number;
  excludeBodies?: string[];
}

export interface RaycastHit {
  body: PhysicsBodyHandle;
  point: Vec3;
  normal: Vec3;
  distance: number;
}

export interface ShapecastHit {
  body: PhysicsBodyHandle;
  point: Vec3;
  normal: Vec3;
  fraction: number;
}

// ============================================================================
// PhysicsApi Interface
// ============================================================================

export interface PhysicsApi {
  createBody(spec: BodySpec): PhysicsBodyHandle;
  destroyBody(handle: PhysicsBodyHandle): void;
  bodyExists(handle: PhysicsBodyHandle): boolean;
  getTransform(handle: PhysicsBodyHandle): Transform;
  setTransform(handle: PhysicsBodyHandle, t: Transform): void;
  getLinearVelocity(handle: PhysicsBodyHandle): Vec3;
  setLinearVelocity(handle: PhysicsBodyHandle, v: Vec3): void;
  getAngularVelocity(handle: PhysicsBodyHandle): Vec3;
  applyImpulse(handle: PhysicsBodyHandle, impulse: Vec3, point?: Vec3): void;
  applyForce(handle: PhysicsBodyHandle, force: Vec3, point?: Vec3): void;
  isGrounded(handle: PhysicsBodyHandle): boolean;
  getContacts(handle: PhysicsBodyHandle): ContactInfo[];
  setShape(handle: PhysicsBodyHandle, role: ShapeRole, shape: ShapeSpec): void;
  raycast(origin: Vec3, dir: Vec3, maxDist: number, filter?: CollisionFilter): RaycastHit | null;
  shapecast(shape: ShapeSpec, from: Transform, to: Transform, filter?: CollisionFilter): ShapecastHit[];
  overlap(shape: ShapeSpec, at: Transform, filter?: CollisionFilter): PhysicsBodyHandle[];
  step(dt: number, maxSubSteps: number): void;
  snapshot(): string;
  verify(expectedHash: string): boolean;
  getBodyCount(): number;
}

// ============================================================================
// Physics Material (realm-aware)
// ============================================================================

export type RealmTier = 'mortal' | 'qi-condensation' | 'foundation' | 'core' | 'nascent-soul' | 'spirit-severing' | 'mahayana';

export interface PhysicsMaterialEntry {
  id: string;
  label: string;
  realmTier?: RealmTier;
  friction: number;
  restitution: number;
  density: number;
}

export interface PhysicsMaterialRegistry {
  register(mat: PhysicsMaterialEntry): void;
  get(id: string): PhysicsMaterialEntry | undefined;
  list(): PhysicsMaterialEntry[];
  getByRealm(tier: RealmTier): PhysicsMaterialEntry[];
  size(): number;
}

// ============================================================================
// Headless Physics Implementation (in-memory stub)
// ============================================================================

const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_VEC: Vec3 = { x: 1, y: 1, z: 1 };
const ZERO_VEC: Vec3 = { x: 0, y: 0, z: 0 };

function createPhysicsApi(): PhysicsApi {
  const bodies = new Map<string, { spec: BodySpec; transform: Transform; linearVel: Vec3; angularVel: Vec3 }>();
  let bodyCounter = 0;

  function makeHandle(): PhysicsBodyHandle {
    bodyCounter++;
    return { id: `phys-${bodyCounter}`, valid: true };
  }

  return {
    createBody(spec: BodySpec): PhysicsBodyHandle {
      const handle = makeHandle();
      bodies.set(handle.id, {
        spec,
        transform: { ...spec.transform },
        linearVel: ZERO_VEC,
        angularVel: ZERO_VEC,
      });
      return handle;
    },

    destroyBody(handle: PhysicsBodyHandle): void {
      bodies.delete(handle.id);
      handle.valid = false;
    },

    bodyExists(handle: PhysicsBodyHandle): boolean {
      return bodies.has(handle.id);
    },

    getTransform(handle: PhysicsBodyHandle): Transform {
      const b = bodies.get(handle.id);
      if (!b) return { position: ZERO_VEC, rotation: IDENTITY_QUAT, scale: UNIT_VEC };
      return { ...b.transform };
    },

    setTransform(handle: PhysicsBodyHandle, t: Transform): void {
      const b = bodies.get(handle.id);
      if (b) b.transform = { ...t };
    },

    getLinearVelocity(handle: PhysicsBodyHandle): Vec3 {
      const b = bodies.get(handle.id);
      return b ? { ...b.linearVel } : ZERO_VEC;
    },

    setLinearVelocity(handle: PhysicsBodyHandle, v: Vec3): void {
      const b = bodies.get(handle.id);
      if (b) b.linearVel = { ...v };
    },

    getAngularVelocity(handle: PhysicsBodyHandle): Vec3 {
      const b = bodies.get(handle.id);
      return b ? { ...b.angularVel } : ZERO_VEC;
    },

    applyImpulse(_handle: PhysicsBodyHandle, _impulse: Vec3, _point?: Vec3): void {
      // headless: no-op
    },

    applyForce(_handle: PhysicsBodyHandle, _force: Vec3, _point?: Vec3): void {
      // headless: no-op
    },

    isGrounded(_handle: PhysicsBodyHandle): boolean {
      return false;
    },

    getContacts(_handle: PhysicsBodyHandle): ContactInfo[] {
      return [];
    },

    setShape(_handle: PhysicsBodyHandle, _role: ShapeRole, _shape: ShapeSpec): void {
      // headless: no-op
    },

    raycast(_origin: Vec3, _dir: Vec3, _maxDist: number, _filter?: CollisionFilter): RaycastHit | null {
      return null;
    },

    shapecast(_shape: ShapeSpec, _from: Transform, _to: Transform, _filter?: CollisionFilter): ShapecastHit[] {
      return [];
    },

    overlap(_shape: ShapeSpec, _at: Transform, _filter?: CollisionFilter): PhysicsBodyHandle[] {
      return [];
    },

    step(_dt: number, _maxSubSteps: number): void {
      // headless: no-op (bodies don't move)
    },

    snapshot(): string {
      // Simple hash of body count + counter
      const data = `bodies=${bodies.size},counter=${bodyCounter}`;
      let h = 0;
      for (let i = 0; i < data.length; i++) {
        h = ((h << 5) - h + data.charCodeAt(i)) | 0;
      }
      return Math.abs(h).toString(16).padStart(8, '0');
    },

    verify(expectedHash: string): boolean {
      return this.snapshot() === expectedHash;
    },

    getBodyCount(): number {
      return bodies.size;
    },
  };
}

// ============================================================================
// Physics Material Registry
// ============================================================================

function createMaterialRegistry(): PhysicsMaterialRegistry {
  const materials = new Map<string, PhysicsMaterialEntry>();

  return {
    register(mat: PhysicsMaterialEntry): void {
      materials.set(mat.id, mat);
    },
    get(id: string): PhysicsMaterialEntry | undefined {
      return materials.get(id);
    },
    list(): PhysicsMaterialEntry[] {
      return Array.from(materials.values());
    },
    getByRealm(tier: RealmTier): PhysicsMaterialEntry[] {
      return Array.from(materials.values()).filter(m => m.realmTier === tier);
    },
    size(): number {
      return materials.size;
    },
  };
}

// ============================================================================
// The Plugin
// ============================================================================

function createPhysicsPlugin(): Plugin & {
  api: PhysicsApi;
  materials: PhysicsMaterialRegistry;
} {
  const api = createPhysicsApi();
  const materials = createMaterialRegistry();

  const plugin: Plugin & {
    api: PhysicsApi;
    materials: PhysicsMaterialRegistry;
  } = {
    id: 'ga:physics',
    version: '0.1.0',
    dependencies: ['ga:determinism'],

    init(h) {
      h.capabilities.register({ capability: 'physics.api', provider: 'ga:physics', version: '0.1.0', instance: api });
      h.capabilities.register({ capability: 'physics.materials', provider: 'ga:physics', version: '0.1.0', instance: materials });
      console.log('[ga:physics] Initialized — 2 capabilities registered (headless backend)');
    },

    destroy(_h) {
      console.log('[ga:physics] Destroyed');
    },

    api,
    materials,
  };

  return plugin;
}

export const PhysicsPlugin = createPhysicsPlugin();

export const PhysicsPluginManifest: PluginManifest = {
  id: 'ga:physics',
  version: '0.1.0',
  engineVersionRange: '>=0.1.0',
  dependencies: [],
  optionalDependencies: [],
  provides: ['physics.api', 'physics.materials'],
  requires: [],
  permissions: ['physics'],
  deterministicMode: 'required',
  workerCompatible: true,
};
