/**
 * Entity Manager — Sim/Render Split ECS
 *
 * Implements the entity-component system from doc 09.
 * Three storage layouts: archetype (hot-path), sparse-set (transient), Map (ad-hoc).
 * Sim-components are serializable, hashed, authoritative.
 * Render-components are derived, non-serializable, non-authoritative.
 *
 * All simulation code uses only deterministic math services.
 */

import type { EntityId, ComponentTypeId, SimulationTier, Tick, SpatialNodeId } from './types';
import { ok, err, type Result } from './types';

// ============================================================================
// Component Interfaces
// ============================================================================

/** Sim-component: serializable, hashed, authoritative state. */
export interface SimComponent {
  readonly __type: string;
  readonly __schemaHash: string;
}

/** Render-component: non-serializable, derived, non-authoritative. */
export interface RenderComponent {
  readonly __type: string;
}

/** Entity record with sim/render split. */
export interface Entity {
  id: EntityId;
  sim: Map<string, SimComponent>;
  render: Map<string, RenderComponent>;
  spatialNode: SpatialNodeId;
  simulationTier: SimulationTier;
  alive: boolean;
}

// ============================================================================
// Entity ID System
// ============================================================================

export interface EntityIdAllocator {
  next(worldSeed: bigint): EntityId;
  reset(worldSeed: bigint): void;
}

/**
 * Deterministic entity ID allocator.
 * 128-bit IDs: high = origin/lineage, low = unique sequential.
 * Uses a simple counter seeded from world seed for determinism.
 */
export function createEntityIdAllocator(): EntityIdAllocator {
  let counter = 0n;
  let currentSeed = 0n;

  return {
    next(worldSeed: bigint): EntityId {
      if (currentSeed !== worldSeed) {
        currentSeed = worldSeed;
        counter = 0n;
      }
      counter++;
      // High 64 bits = world seed, low 64 bits = sequential counter
      const low = counter;
      return (worldSeed << 64n) | (low & 0xFFFFFFFFFFFFFFFFn);
    },

    reset(worldSeed: bigint) {
      currentSeed = worldSeed;
      counter = 0n;
    },
  };
}

// ============================================================================
// Query Specification
// ============================================================================

export interface QuerySpec {
  all?: string[];       // AND — must have all these sim-components
  none?: string[];      // NOT — must NOT have any of these
  any?: string[];       // OR — must have at least one of these
  tierGte?: SimulationTier;
  aliveOnly?: boolean;
}

export interface CompiledQuery {
  readonly spec: QuerySpec;
  matches(entity: Entity): boolean;
}

// ============================================================================
// Entity Manager Interface
// ============================================================================

export interface EntityManager {
  // Entity lifecycle
  create(spatialNode?: SpatialNodeId, tier?: SimulationTier): EntityId;
  destroy(id: EntityId): Result<void>;
  get(id: EntityId): Entity | undefined;
  exists(id: EntityId): boolean;
  list(): EntityId[];
  count(): number;

  // Sim-components (authoritative)
  attachSim(id: EntityId, component: SimComponent): Result<void>;
  getSim<T extends SimComponent>(id: EntityId, type: string): T | undefined;
  removeSim(id: EntityId, type: string): Result<void>;
  hasSim(id: EntityId, type: string): boolean;

  // Render-components (derived, non-authoritative)
  attachRender(id: EntityId, component: RenderComponent): Result<void>;
  getRender<T extends RenderComponent>(id: EntityId, type: string): T | undefined;
  removeRender(id: EntityId, type: string): Result<void>;

  // Tier management
  setTier(id: EntityId, tier: SimulationTier): Result<void>;
  getTier(id: EntityId): SimulationTier;

  // Queries
  compileQuery(spec: QuerySpec): CompiledQuery;
  query(spec: QuerySpec): EntityId[];
  queryEntities(spec: QuerySpec): Entity[];

  // Spatial
  setSpatialNode(id: EntityId, node: SpatialNodeId): Result<void>;
  getSpatialNode(id: EntityId): SpatialNodeId;

  // State management
  clear(): void;
}

// ============================================================================
// Implementation
// ============================================================================

export function createEntityManager(allocator?: EntityIdAllocator): EntityManager {
  const idAlloc = allocator ?? createEntityIdAllocator();
  const entities = new Map<string, Entity>();
  let worldSeed = 0n;

  // Pending lifecycle operations (deferred to end-of-tick)
  const pendingAttaches: Array<{ id: EntityId; component: SimComponent; op: 'attach' | 'remove' }> = [];

  function keyOf(id: EntityId): string {
    return id.toString();
  }

  function create(spatialNode: SpatialNodeId = 0n, tier: SimulationTier = 2): EntityId {
    const id = idAlloc.next(worldSeed);
    const entity: Entity = {
      id,
      sim: new Map(),
      render: new Map(),
      spatialNode,
      simulationTier: tier,
      alive: true,
    };
    entities.set(keyOf(id), entity);
    return id;
  }

  function destroy(id: EntityId): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    if (!entity.alive) return err('Entity already destroyed');

    entity.alive = false;
    // Clean up render components (call dispose if available)
    for (const [, comp] of entity.render) {
      if ('__dispose' in comp && typeof (comp as any).__dispose === 'function') {
        (comp as any).__dispose();
      }
    }
    entity.render.clear();
    entities.delete(keyOf(id));
    return ok(undefined);
  }

  function get(id: EntityId): Entity | undefined {
    return entities.get(keyOf(id));
  }

  function exists(id: EntityId): boolean {
    return entities.has(keyOf(id));
  }

  function list(): EntityId[] {
    return Array.from(entities.values()).map(e => e.id);
  }

  function count(): number {
    return entities.size;
  }

  function attachSim(id: EntityId, component: SimComponent): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    if (!entity.alive) return err('Entity is destroyed');
    entity.sim.set(component.__type, component);
    pendingAttaches.push({ id, component, op: 'attach' });
    return ok(undefined);
  }

  function getSim<T extends SimComponent>(id: EntityId, type: string): T | undefined {
    const entity = entities.get(keyOf(id));
    return entity?.sim.get(type) as T | undefined;
  }

  function removeSim(id: EntityId, type: string): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    if (!entity.alive) return err('Entity is destroyed');
    if (!entity.sim.has(type)) return err(`Sim-component ${type} not attached`);
    entity.sim.delete(type);
    pendingAttaches.push({ id, component: { __type: type, __schemaHash: '' } as SimComponent, op: 'remove' });
    return ok(undefined);
  }

  function hasSim(id: EntityId, type: string): boolean {
    const entity = entities.get(keyOf(id));
    return entity?.sim.has(type) ?? false;
  }

  function attachRender(id: EntityId, component: RenderComponent): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    if (!entity.alive) return err('Entity is destroyed');
    entity.render.set(component.__type, component);
    return ok(undefined);
  }

  function getRender<T extends RenderComponent>(id: EntityId, type: string): T | undefined {
    const entity = entities.get(keyOf(id));
    return entity?.render.get(type) as T | undefined;
  }

  function removeRender(id: EntityId, type: string): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    entity.render.delete(type);
    return ok(undefined);
  }

  function setTier(id: EntityId, tier: SimulationTier): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    entity.simulationTier = tier;
    return ok(undefined);
  }

  function getTier(id: EntityId): SimulationTier {
    const entity = entities.get(keyOf(id));
    return entity?.simulationTier ?? 0;
  }

  function setSpatialNode(id: EntityId, node: SpatialNodeId): Result<void> {
    const entity = entities.get(keyOf(id));
    if (!entity) return err('Entity not found');
    entity.spatialNode = node;
    return ok(undefined);
  }

  function getSpatialNode(id: EntityId): SpatialNodeId {
    const entity = entities.get(keyOf(id));
    return entity?.spatialNode ?? 0n;
  }

  function compileQuery(spec: QuerySpec): CompiledQuery {
    return {
      spec,
      matches(entity: Entity): boolean {
        if (!entity.alive) return false;

        if (spec.aliveOnly !== false && !entity.alive) return false;

        if (spec.all) {
          for (const type of spec.all) {
            if (!entity.sim.has(type)) return false;
          }
        }

        if (spec.none) {
          for (const type of spec.none) {
            if (entity.sim.has(type)) return false;
          }
        }

        if (spec.any && spec.any.length > 0) {
          if (!spec.any.some(type => entity.sim.has(type))) return false;
        }

        if (spec.tierGte !== undefined) {
          if (entity.simulationTier < spec.tierGte) return false;
        }

        return true;
      },
    };
  }

  function query(spec: QuerySpec): EntityId[] {
    const compiled = compileQuery(spec);
    const results: EntityId[] = [];
    for (const entity of entities.values()) {
      if (compiled.matches(entity)) {
        results.push(entity.id);
      }
    }
    return results;
  }

  function queryEntities(spec: QuerySpec): Entity[] {
    const compiled = compileQuery(spec);
    const results: Entity[] = [];
    for (const entity of entities.values()) {
      if (compiled.matches(entity)) {
        results.push(entity);
      }
    }
    return results;
  }

  function clear(): void {
    for (const entity of entities.values()) {
      for (const [, comp] of entity.render) {
        if ('__dispose' in comp && typeof (comp as any).__dispose === 'function') {
          (comp as any).__dispose();
        }
      }
    }
    entities.clear();
    pendingAttaches.length = 0;
  }

  return {
    create, destroy, get, exists, list, count,
    attachSim, getSim, removeSim, hasSim,
    attachRender, getRender, removeRender,
    setTier, getTier,
    compileQuery, query, queryEntities,
    setSpatialNode, getSpatialNode,
    clear,
  };
}

// ============================================================================
// Predefined Sim-Component Types
// ============================================================================

/** Transform component (position, rotation, scale) — sim-authoritative. */
export interface TransformSim extends SimComponent {
  readonly __type: 'transform';
  readonly __schemaHash: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
}

/** Simulation tier tracking component. */
export interface SimulationTierComponent extends SimComponent {
  readonly __type: 'simulation-tier';
  readonly __schemaHash: string;
  tier: SimulationTier;
  tierHistory: Array<{ tick: Tick; from: SimulationTier; to: SimulationTier; reason: string }>;
  promotionEligible: boolean;
  demotionEligible: boolean;
  scheduledEvents: Array<{ eventId: string; firesAtTick: Tick; outcome: unknown }>;
}

/** Simulation profile for tier transitions (doc 25). */
export interface SimulationProfile extends SimComponent {
  readonly __type: 'simulation-profile';
  readonly __schemaHash: string;
  canonicalSnapshot: unknown;
  lastTierChangeTick: Tick;
  ticksAtCurrentTier: number;
  tierLockReason?: string;
}

/** Null entity constant. */
export const NULL_ENTITY_ID: EntityId = 0n;
