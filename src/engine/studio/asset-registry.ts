/**
 * Asset / Entity / Cell Separation
 * =================================
 *
 * Corrects the architectural issue where placeAssetInWorld() conflated
 * GLB assets with world cells. The proper hierarchy is:
 *
 *   MeshKernel → compile → AssetRevision (content-addressed)
 *     → EntityInstance (placed in world with transform)
 *       → WorldCell (spatial streaming container)
 *
 * Multiple entities can reference the same asset revision.
 * Multiple cells can contain multiple entities.
 * An asset revision change doesn't require moving entities.
 */

import type { GLBExportResult } from './glb-export';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Asset Revision (content-addressed, immutable)
// ---------------------------------------------------------------------------

export interface AssetRevision {
  assetId: string;
  revision: number;
  /** Content hash of the GLB binary. */
  contentHash: string;
  /** GLB binary artifact. */
  glbArtifact: GLBExportResult | null;
  /** Mesh stats at this revision. */
  vertexCount: number;
  faceCount: number;
  triangleCount: number;
  /** Material count. */
  materialCount: number;
  /** When this revision was created. */
  createdAt: string;
  /** Provenance: what created this asset. */
  source: 'studio-operation-stack' | 'structure-grammar' | 'character-authoring' | 'imported-glb' | 'placeholder';
}

// ---------------------------------------------------------------------------
// Entity Instance (placed in world)
// ---------------------------------------------------------------------------

export interface EntityInstance {
  entityId: string;
  /** Reference to the asset revision. */
  assetId: string;
  assetRevision: number;
  /** World-space transform. */
  transform: {
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number, number];
  };
  /** Which cell this entity is in. */
  cellId: string;
  /** Whether this entity is visible. */
  visible: boolean;
  /** Tags for this instance. */
  tags: string[];
}

// ---------------------------------------------------------------------------
// World Cell (spatial streaming container)
// ---------------------------------------------------------------------------

export interface WorldCellV2 {
  cellId: string;
  /** Spatial bounds. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
  /** Entity instances in this cell. */
  entityIds: string[];
  /** Cell revision. */
  revision: number;
  /** Streaming tier. */
  streamingTier: number;
}

// ---------------------------------------------------------------------------
// Asset Registry (in-memory)
// ---------------------------------------------------------------------------

export class AssetRegistry {
  private revisions = new Map<string, AssetRevision[]>();
  private instances = new Map<string, EntityInstance>();
  private cells = new Map<string, WorldCellV2>();
  private entityCounter = 0;
  private cellCounter = 0;

  /**
   * Register a new asset revision. Returns the revision.
   */
  registerRevision(
    assetId: string,
    glb: GLBExportResult | null,
    vertexCount: number,
    faceCount: number,
    triangleCount: number,
    materialCount: number,
    source: AssetRevision['source'],
  ): AssetRevision {
    const existing = this.revisions.get(assetId) ?? [];
    const revision = existing.length + 1;
    const contentHash = glb?.hash ?? createHash('sha256')
      .update(`${assetId}-${revision}-${vertexCount}-${faceCount}`)
      .digest('hex').slice(0, 16);

    const assetRevision: AssetRevision = {
      assetId,
      revision,
      contentHash,
      glbArtifact: glb,
      vertexCount,
      faceCount,
      triangleCount,
      materialCount,
      createdAt: new Date().toISOString(),
      source,
    };

    existing.push(assetRevision);
    this.revisions.set(assetId, existing);
    return assetRevision;
  }

  /**
   * Get the latest revision of an asset.
   */
  getLatestRevision(assetId: string): AssetRevision | null {
    const revisions = this.revisions.get(assetId);
    if (!revisions || revisions.length === 0) return null;
    return revisions[revisions.length - 1];
  }

  /**
   * Get a specific revision.
   */
  getRevision(assetId: string, revision: number): AssetRevision | null {
    const revisions = this.revisions.get(assetId);
    if (!revisions) return null;
    return revisions.find((r) => r.revision === revision) ?? null;
  }

  /**
   * Create an entity instance from an asset revision.
   */
  createEntityInstance(
    assetId: string,
    revision: number,
    position: [number, number, number],
    cellId: string,
  ): EntityInstance {
    const entityId = `entity-${++this.entityCounter}-${Date.now().toString(36)}`;
    const instance: EntityInstance = {
      entityId,
      assetId,
      assetRevision,
      transform: {
        position,
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      cellId,
      visible: true,
      tags: [],
    };

    this.instances.set(entityId, instance);

    // Add to cell
    let cell = this.cells.get(cellId);
    if (!cell) {
      cell = {
        cellId,
        bounds: {
          min: [position[0] - 10, 0, position[2] - 10],
          max: [position[0] + 10, 20, position[2] + 10],
        },
        entityIds: [],
        revision: 1,
        streamingTier: 0,
      };
      this.cells.set(cellId, cell);
    }
    cell.entityIds.push(entityId);

    return instance;
  }

  /**
   * Move an entity to a new position (may change cells).
   */
  moveEntity(entityId: string, newPosition: [number, number, number]): boolean {
    const instance = this.instances.get(entityId);
    if (!instance) return false;

    const oldCellId = instance.cellId;
    instance.transform.position = newPosition;

    // Check if entity crossed cell boundary (simplified: cells are 20m squares)
    // In production, this would use proper spatial partitioning
    const oldCell = this.cells.get(oldCellId);
    if (oldCell) {
      const inBounds =
        newPosition[0] >= oldCell.bounds.min[0] && newPosition[0] <= oldCell.bounds.max[0] &&
        newPosition[2] >= oldCell.bounds.min[2] && newPosition[2] <= oldCell.bounds.max[2];

      if (!inBounds) {
        // Move to new cell
        const newCellId = `cell-${++this.cellCounter}`;
        oldCell.entityIds = oldCell.entityIds.filter((id) => id !== entityId);
        instance.cellId = newCellId;

        let newCell = this.cells.get(newCellId);
        if (!newCell) {
          newCell = {
            cellId: newCellId,
            bounds: {
              min: [newPosition[0] - 10, 0, newPosition[2] - 10],
              max: [newPosition[0] + 10, 20, newPosition[2] + 10],
            },
            entityIds: [],
            revision: 1,
            streamingTier: 0,
          };
          this.cells.set(newCellId, newCell);
        }
        newCell.entityIds.push(entityId);
      }
    }

    return true;
  }

  /**
   * Get all instances in a cell.
   */
  getCellEntities(cellId: string): EntityInstance[] {
    const cell = this.cells.get(cellId);
    if (!cell) return [];
    return cell.entityIds
      .map((id) => this.instances.get(id))
      .filter((i): i is EntityInstance => i !== undefined);
  }

  /**
   * Get all cells.
   */
  getCells(): WorldCellV2[] {
    return Array.from(this.cells.values());
  }

  /**
   * Get all asset revisions.
   */
  getAllRevisions(): Array<{ assetId: string; revisionCount: number; latestHash: string }> {
    return Array.from(this.revisions.entries()).map(([assetId, revs]) => ({
      assetId,
      revisionCount: revs.length,
      latestHash: revs[revs.length - 1].contentHash,
    }));
  }

  /**
   * Get registry summary.
   */
  getSummary(): {
    totalAssets: number;
    totalRevisions: number;
    totalInstances: number;
    totalCells: number;
    instancesPerAsset: Record<string, number>;
  } {
    const instancesPerAsset: Record<string, number> = {};
    for (const [, instance] of this.instances) {
      instancesPerAsset[instance.assetId] = (instancesPerAsset[instance.assetId] ?? 0) + 1;
    }
    return {
      totalAssets: this.revisions.size,
      totalRevisions: Array.from(this.revisions.values()).reduce((s, r) => s + r.length, 0),
      totalInstances: this.instances.size,
      totalCells: this.cells.size,
      instancesPerAsset,
    };
  }
}

// Singleton
let registryInstance: AssetRegistry | null = null;

export function getAssetRegistry(): AssetRegistry {
  if (!registryInstance) {
    registryInstance = new AssetRegistry();
  }
  return registryInstance;
}
