/**
 * Physics Runtime — Rapier Adapter
 * ==================================
 *
 * Per FRONTIER_TECHNOLOGY_MATRIX.md, Rapier is the S-tier candidate for
 * browser-facing physics. It provides 2D/3D/f64 variants and maintained
 * JS/TS packages.
 *
 * Use it for:
 *   - Character capsules
 *   - Rigid bodies
 *   - Projectiles
 *   - Local debris
 *   - Triggers
 *   - Interaction volumes
 *   - Vehicle/artifact collision
 *   - Initial terrain collision
 *
 * Jolt Physics is the native-side long-term contender (Bake-off 7).
 *
 * This adapter wraps @dimforge/rapier3d-compat for use in the viewport.
 */

// ---------------------------------------------------------------------------
// Adapter Status
// ---------------------------------------------------------------------------

let available = false;
let reason: string | undefined;
let rapierWorld: unknown = null;

async function ensureInitialized(): Promise<void> {
  if (available) return;
  try {
    const Rapier = await import('@dimforge/rapier3d-compat');
    await Rapier.init();
    available = true;
    reason = `Rapier ${Rapier.version ?? 'unknown'} initialized (WASM)`;
  } catch (err) {
    available = false;
    reason = `Rapier initialization failed: ${(err as Error).message}`;
  }
}

// ---------------------------------------------------------------------------
// Physics Adapter
// ---------------------------------------------------------------------------

class PhysicsAdapter {
  async getStatus(): Promise<{
    available: boolean;
    reason: string;
    useCases: string[];
    bakeOff: string;
    nativeAlternative: string;
  }> {
    await ensureInitialized();
    return {
      available,
      reason: reason ?? '',
      useCases: [
        'Character capsules',
        'Rigid bodies',
        'Projectiles',
        'Local debris',
        'Triggers',
        'Interaction volumes',
        'Vehicle/artifact collision',
        'Initial terrain collision',
      ],
      bakeOff: 'Bake-off 5+7: physics continuity during planet traversal; terrain collision',
      nativeAlternative: 'Jolt Physics — multithreaded, optional double precision, deterministic (native-side future)',
    };
  }

  /**
   * Create a Rapier physics world.
   * This is the entry point for browser physics simulation.
   */
  async createWorld(): Promise<unknown> {
    await ensureInitialized();
    if (!available) {
      throw new Error('Rapier not available');
    }
    const Rapier = await import('@dimforge/rapier3d-compat');
    const gravity = { x: 0, y: -9.81, z: 0 };
    rapierWorld = new Rapier.World(gravity);
    return rapierWorld;
  }

  /**
   * Step the physics simulation by dt seconds.
   */
  async step(dt: number): Promise<void> {
    if (!rapierWorld) return;
    const world = rapierWorld as { step: () => void };
    world.step();
  }

  /**
   * Create a character capsule collider.
   */
  async createCharacterCapsule(position: { x: number; y: number; z: number }, radius: number, height: number): Promise<unknown> {
    await ensureInitialized();
    if (!available || !rapierWorld) {
      throw new Error('Rapier world not initialized');
    }
    const Rapier = await import('@dimforge/rapier3d-compat');
    const world = rapierWorld as { createRigidBody: (desc: unknown) => unknown; createCollider: (desc: unknown, body: unknown) => unknown };
    const bodyDesc = (Rapier as any).RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = (Rapier as any).ColliderDesc.capsule(height / 2, radius);
    world.createCollider(colliderDesc, body);
    return body;
  }
}

// Singleton
let adapter: PhysicsAdapter | null = null;

export function getPhysicsAdapter(): PhysicsAdapter {
  if (!adapter) {
    adapter = new PhysicsAdapter();
  }
  return adapter;
}
