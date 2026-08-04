/**
 * Spatial Selection System
 *
 * Implements doc 50 §3. Converts user input (brush, lasso, ray,
 * semantic query) into a SpatialSelection mask that plugins can
 * consume.
 *
 * No forbidden functions. No Three.js, no DOM.
 */

import type {
  EntityId,
  CapabilityId,
  Tick,
  SpatialSelection,
  SelectionShape,
  SelectionShapeType,
  SelectionFilter,
  SelectionSource,
  FalloffProfile,
  Bounds3D,
  Vec3,
  ExclusionZone,
} from './types';

// ============================================================================
// Selection registry
// ============================================================================

export interface SelectionRegistry {
  create(shape: SelectionShape, source: SelectionSource, options?: SelectionOptions): SpatialSelection;
  get(id: string): SpatialSelection | undefined;
  list(): string[];
  remove(id: string): boolean;
  combine(ids: string[], operation: 'union' | 'intersection' | 'difference'): string | null;
  addFilter(id: string, filter: SelectionFilter): boolean;
  addExclusion(id: string, exclusion: ExclusionZone): boolean;
}

export interface SelectionOptions {
  falloff?: FalloffProfile;
  filters?: SelectionFilter[];
  exclusions?: ExclusionZone[];
  entities?: EntityId[];
  terrainChunks?: string[];
  affectedSystems?: CapabilityId[];
}

// ============================================================================
// Bounds computation
// ============================================================================

export function computeBounds(shape: SelectionShape): Bounds3D {
  switch (shape.type) {
    case 'point':
      return {
        min: { ...shape.position },
        max: { ...shape.position },
      };
    case 'sphere':
      return {
        min: { x: shape.center.x - shape.radius, y: shape.center.y - shape.radius, z: shape.center.z - shape.radius },
        max: { x: shape.center.x + shape.radius, y: shape.center.y + shape.radius, z: shape.center.z + shape.radius },
      };
    case 'box':
      return {
        min: { x: shape.center.x - shape.halfExtents.x, y: shape.center.y - shape.halfExtents.y, z: shape.center.z - shape.halfExtents.z },
        max: { x: shape.center.x + shape.halfExtents.x, y: shape.center.y + shape.halfExtents.y, z: shape.center.z + shape.halfExtents.z },
      };
    case 'cylinder':
      return {
        min: { x: shape.base.x - shape.radius, y: shape.base.y, z: shape.base.z - shape.radius },
        max: { x: shape.base.x + shape.radius, y: shape.base.y + shape.height, z: shape.base.z + shape.radius },
      };
    case 'terrain_height_range':
      return shape.bounds;
    case 'surface_brush': {
      if (shape.strokes.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const s of shape.strokes) {
        minX = Math.min(minX, s.position.x - s.radius);
        minY = Math.min(minY, s.position.y);
        minZ = Math.min(minZ, s.position.z - s.radius);
        maxX = Math.max(maxX, s.position.x + s.radius);
        maxY = Math.max(maxY, s.position.y);
        maxZ = Math.max(maxZ, s.position.z + s.radius);
      }
      return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
    }
    case 'spline': {
      if (shape.points.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const p of shape.points) {
        minX = Math.min(minX, p.x - shape.width);
        minY = Math.min(minY, p.y);
        minZ = Math.min(minZ, p.z - shape.width);
        maxX = Math.max(maxX, p.x + shape.width);
        maxY = Math.max(maxY, p.y);
        maxZ = Math.max(maxZ, p.z + shape.width);
      }
      return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
    }
    case 'path_corridor': {
      if (shape.path.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const p of shape.path) {
        minX = Math.min(minX, p.x - shape.width);
        minY = Math.min(minY, p.y);
        minZ = Math.min(minZ, p.z - shape.width);
        maxX = Math.max(maxX, p.x + shape.width);
        maxY = Math.max(maxY, p.y);
        maxZ = Math.max(maxZ, p.z + shape.width);
      }
      return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
    }
    case 'flood_fill':
      return {
        min: { x: shape.seed.x - 1, y: shape.seed.y - 1, z: shape.seed.z - 1 },
        max: { x: shape.seed.x + 1, y: shape.seed.y + 1, z: shape.seed.z + 1 },
      };
    case 'semantic_query':
    case 'hierarchy':
    case 'rectangle':
    case 'lasso':
    default:
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
}

// ============================================================================
// Containment test (does a point fall within a shape?)
// ============================================================================

export function containsPoint(shape: SelectionShape, point: Vec3): boolean {
  switch (shape.type) {
    case 'point':
      return point.x === shape.position.x && point.y === shape.position.y && point.z === shape.position.z;
    case 'sphere': {
      const dx = point.x - shape.center.x;
      const dy = point.y - shape.center.y;
      const dz = point.z - shape.center.z;
      return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
    }
    case 'box': {
      return Math.abs(point.x - shape.center.x) <= shape.halfExtents.x
        && Math.abs(point.y - shape.center.y) <= shape.halfExtents.y
        && Math.abs(point.z - shape.center.z) <= shape.halfExtents.z;
    }
    case 'cylinder': {
      const dx = point.x - shape.base.x;
      const dz = point.z - shape.base.z;
      const inRadius = dx * dx + dz * dz <= shape.radius * shape.radius;
      const inHeight = point.y >= shape.base.y && point.y <= shape.base.y + shape.height;
      return inRadius && inHeight;
    }
    case 'terrain_height_range':
      return point.y >= shape.min && point.y <= shape.max
        && point.x >= shape.bounds.min.x && point.x <= shape.bounds.max.x
        && point.z >= shape.bounds.min.z && point.z <= shape.bounds.max.z;
    case 'surface_brush':
      return shape.strokes.some(s => {
        const dx = point.x - s.position.x;
        const dz = point.z - s.position.z;
        return dx * dx + dz * dz <= s.radius * s.radius;
      });
    case 'spline':
    case 'path_corridor': {
      const path = 'path' in shape ? shape.path : [];
      const width = 'width' in shape ? shape.width : 0;
      for (const p of path) {
        const dx = point.x - p.x;
        const dz = point.z - p.z;
        if (dx * dx + dz * dz <= width * width) return true;
      }
      return false;
    }
    case 'flood_fill':
    case 'semantic_query':
    case 'hierarchy':
    case 'rectangle':
    case 'lasso':
    default:
      return false;  // screen-space shapes need camera; semantic/hierarchy need context
  }
}

// ============================================================================
// Falloff evaluation
// ============================================================================

export function evaluateFalloff(falloff: FalloffProfile, distance: number, maxDistance: number): number {
  switch (falloff.type) {
    case 'constant':
      return 1;
    case 'linear': {
      const t = (distance - falloff.start) / (falloff.end - falloff.start);
      return Math.max(0, Math.min(1, 1 - t));
    }
    case 'smooth': {
      const t = (distance - falloff.start) / (falloff.end - falloff.start);
      const clamped = Math.max(0, Math.min(1, t));
      return 1 - clamped * clamped * (3 - 2 * clamped);  // smoothstep
    }
    case 'custom': {
      if (falloff.samples.length === 0) return 1;
      for (let i = 0; i < falloff.samples.length - 1; i++) {
        if (distance >= falloff.samples[i][0] && distance <= falloff.samples[i + 1][0]) {
          const t = (distance - falloff.samples[i][0]) / (falloff.samples[i + 1][0] - falloff.samples[i][0]);
          return falloff.samples[i][1] * (1 - t) + falloff.samples[i + 1][1] * t;
        }
      }
      return 0;
    }
  }
}

// ============================================================================
// Filter evaluation
// ============================================================================

export interface FilterableEntity {
  entityId: EntityId;
  type: string;
  tags: string[];
  faction?: string;
  material?: string;
  origin?: string;
  assetHash?: string;
  pluginId?: string;
  visible?: boolean;
  navigable?: boolean;
}

export function passesFilter(entity: FilterableEntity, filter: SelectionFilter): boolean {
  let result = false;
  switch (filter.kind) {
    case 'by_type': result = entity.type === filter.value; break;
    case 'by_tag': result = entity.tags.includes(filter.value); break;
    case 'by_faction': result = entity.faction === filter.value; break;
    case 'by_material': result = entity.material === filter.value; break;
    case 'by_origin': result = entity.origin === filter.value; break;
    case 'by_asset': result = entity.assetHash === filter.value; break;
    case 'by_plugin': result = entity.pluginId === filter.value; break;
    case 'by_visible': result = entity.visible === (filter.value === 'true'); break;
    case 'by_navigation': result = entity.navigable === (filter.value === 'true'); break;
  }
  return filter.negate ? !result : result;
}

export function passesAllFilters(entity: FilterableEntity, filters: SelectionFilter[]): boolean {
  return filters.every(f => passesFilter(entity, f));
}

// ============================================================================
// Registry implementation
// ============================================================================

export function createSelectionRegistry(currentTick: () => Tick): SelectionRegistry {
  const selections = new Map<string, SpatialSelection>();
  let counter = 0;

  function nextId(): string {
    return `selection-${counter++}`;
  }

  return {
    create(shape: SelectionShape, source: SelectionSource, options?: SelectionOptions): SpatialSelection {
      const id = nextId();
      const bounds = computeBounds(shape);
      const selection: SpatialSelection = {
        id,
        shape,
        worldBounds: bounds,
        includedEntities: options?.entities ?? [],
        includedTerrainChunks: options?.terrainChunks ?? [],
        affectedSystems: options?.affectedSystems ?? [],
        falloff: options?.falloff ?? { type: 'constant' },
        filters: options?.filters ?? [],
        exclusions: options?.exclusions ?? [],
        source,
        createdAtTick: currentTick(),
      };
      selections.set(id, selection);
      return selection;
    },

    get(id: string): SpatialSelection | undefined {
      return selections.get(id);
    },

    list(): string[] {
      return Array.from(selections.keys());
    },

    remove(id: string): boolean {
      return selections.delete(id);
    },

    combine(ids: string[], operation: 'union' | 'intersection' | 'difference'): string | null {
      const toCombine = ids.map(id => selections.get(id)).filter((s): s is SpatialSelection => s !== undefined);
      if (toCombine.length < 2) return null;

      // Compute combined bounds
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const s of toCombine) {
        minX = Math.min(minX, s.worldBounds.min.x);
        minY = Math.min(minY, s.worldBounds.min.y);
        minZ = Math.min(minZ, s.worldBounds.min.z);
        maxX = Math.max(maxX, s.worldBounds.max.x);
        maxY = Math.max(maxY, s.worldBounds.max.y);
        maxZ = Math.max(maxZ, s.worldBounds.max.z);
      }

      let combinedEntities: EntityId[];
      switch (operation) {
        case 'union':
          combinedEntities = Array.from(new Set(toCombine.flatMap(s => s.includedEntities)));
          break;
        case 'intersection': {
          const sets = toCombine.map(s => new Set(s.includedEntities.map(String)));
          combinedEntities = toCombine[0].includedEntities.filter(e =>
            sets.every(set => set.has(String(e)))
          );
          break;
        }
        case 'difference':
          combinedEntities = toCombine[0].includedEntities.filter(e =>
            !toCombine.slice(1).some(s => s.includedEntities.map(String).includes(String(e)))
          );
          break;
      }

      const id = `selection-${counter++}`;
      const combined: SpatialSelection = {
        id,
        shape: { type: 'box', center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }, halfExtents: { x: (maxX - minX) / 2, y: (maxY - minY) / 2, z: (maxZ - minZ) / 2 } },
        worldBounds: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
        includedEntities: combinedEntities,
        includedTerrainChunks: Array.from(new Set(toCombine.flatMap(s => s.includedTerrainChunks))),
        affectedSystems: Array.from(new Set(toCombine.flatMap(s => s.affectedSystems))),
        falloff: { type: 'constant' },
        filters: [],
        exclusions: [],
        source: 'combined',
        createdAtTick: currentTick(),
      };
      selections.set(id, combined);
      return id;
    },

    addFilter(id: string, filter: SelectionFilter): boolean {
      const s = selections.get(id);
      if (!s) return false;
      s.filters.push(filter);
      return true;
    },

    addExclusion(id: string, exclusion: ExclusionZone): boolean {
      const s = selections.get(id);
      if (!s) return false;
      s.exclusions.push(exclusion);
      return true;
    },
  };
}
