/**
 * Asset / Entity / Cell Separation — Canonical Asset Registry
 * =============================================================
 *
 * Corrects the architectural issue where placeAssetInWorld() conflated
 * GLB assets with world cells. The proper hierarchy is:
 *
 *   AssetPipeline → validate → AssetRevision (content-addressed)
 *     → EntityInstance (placed in world with transform)
 *       → WorldCell (spatial streaming container)
 *
 * Multiple entities can reference the same asset revision.
 * Multiple cells can contain multiple entities.
 * An asset revision change doesn't require moving entities.
 *
 * This registry is REAL:
 *   - content hashes are SHA-256 over the full GLB bytes (not a 4 KB slice),
 *   - revisions record their source semantic hash and validation state,
 *   - derived artifacts (LOD chain, collision hierarchy, GLB) are attached
 *     and revisioned AGAINST the source revision (engine rule: derived
 *     artifacts record their source revision; never activate artifacts
 *     from mismatched source revisions),
 *   - the whole registry serializes to JSON (GLB bytes as base64) and
 *     reloads from disk with matching hashes (world-asset-store pattern).
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { sha256Hex } from '../assets/content-hash';

// ---------------------------------------------------------------------------
// Asset Revision (content-addressed, immutable)
// ---------------------------------------------------------------------------

export type AssetSource =
  | 'studio-operation-stack'
  | 'structure-grammar'
  | 'character-authoring'
  | 'imported-glb'
  | 'procedural-pipeline'
  | 'placeholder';

export interface DerivedArtifact {
  artifactId: string;
  kind: 'lod-chain' | 'collision-hierarchy' | 'glb';
  /** Source revision this artifact was derived from. */
  sourceRevision: number;
  /** Content hash of the artifact. */
  hash: string;
  /** Machine-readable artifact summary (counts, sizes, levels). */
  summary: Record<string, unknown>;
}

export interface AssetRevision {
  assetId: string;
  revision: number;
  /** SHA-256 of the full GLB binary. */
  contentHash: string;
  /** Hash of the source SemanticAsset geometry (positions+uvs+normals+indices). */
  semanticHash: string;
  /** GLB binary artifact. */
  glbBytes: Uint8Array | null;
  /** Mesh stats at this revision. */
  vertexCount: number;
  faceCount: number;
  triangleCount: number;
  /** Material count. */
  materialCount: number;
  /** When this revision was created. */
  createdAt: string;
  /** Provenance: what created this asset. */
  source: AssetSource;
  /** Derived artifacts bound to this revision. */
  artifacts: DerivedArtifact[];
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
// Register input
// ---------------------------------------------------------------------------

export interface RegisterRevisionInput {
  assetId: string;
  glbBytes?: Uint8Array | null;
  semanticHash: string;
  vertexCount: number;
  faceCount: number;
  triangleCount: number;
  materialCount: number;
  source: AssetSource;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Asset Registry (in-memory + fs-persisted)
// ---------------------------------------------------------------------------

export class AssetRegistry {
  private revisions = new Map<string, AssetRevision[]>();
  private instances = new Map<string, EntityInstance>();
  private cells = new Map<string, WorldCellV2>();
  private entityCounter = 0;
  private cellCounter = 0;
  private storageDir: string | null;

  constructor(storageDir: string | null = null) {
    this.storageDir = storageDir;
  }

  /**
   * Register a new asset revision. The revision number is the append index
   * (1-based); the content hash is SHA-256 over the FULL GLB bytes when a
   * GLB is provided, else derived from the semantic hash (still
   * deterministic and content-addressed).
   */
  registerRevision(input: RegisterRevisionInput): AssetRevision {
    const existing = this.revisions.get(input.assetId) ?? [];
    const revision = existing.length + 1;
    const contentHash = input.glbBytes
      ? sha256Hex(input.glbBytes)
      : sha256Hex(new TextEncoder().encode(`${input.assetId}:${revision}:${input.semanticHash}`));

    const assetRevision: AssetRevision = {
      assetId: input.assetId,
      revision,
      contentHash,
      semanticHash: input.semanticHash,
      glbBytes: input.glbBytes ?? null,
      vertexCount: input.vertexCount,
      faceCount: input.faceCount,
      triangleCount: input.triangleCount,
      materialCount: input.materialCount,
      createdAt: input.createdAt ?? new Date().toISOString(),
      source: input.source,
      artifacts: [],
    };

    existing.push(assetRevision);
    this.revisions.set(input.assetId, existing);
    return assetRevision;
  }

  /**
   * Attach a derived artifact (LOD chain, collision hierarchy, GLB) to a
   * specific source revision. Every artifact carries its sourceRevision so
   * consumers can refuse mismatched combinations.
   */
  attachDerivedArtifact(assetId: string, revision: number, artifact: DerivedArtifact): boolean {
    const rev = this.getRevision(assetId, revision);
    if (!rev) return false;
    rev.artifacts.push(artifact);
    return true;
  }

  /** Get artifacts of a kind for a revision. */
  getArtifacts(assetId: string, revision: number, kind: DerivedArtifact['kind']): DerivedArtifact[] {
    const rev = this.getRevision(assetId, revision);
    if (!rev) return [];
    return rev.artifacts.filter((a) => a.kind === kind);
  }

  /**
   * Get the latest revision of an asset.
   */
  getLatestRevision(assetId: string): AssetRevision | null {
    const revisions = this.revisions.get(assetId);
    if (!revisions || revisions.length === 0) return null;
    return revisions[revisions.length - 1]!;
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
   * Create an entity instance from an asset revision. Multiple instances
   * may share one revision — this is the proof of revision sharing.
   */
  createEntityInstance(
    assetId: string,
    revision: number,
    position: [number, number, number],
    cellId: string,
    tags: string[] = [],
  ): EntityInstance {
    const entityId = `entity-${++this.entityCounter}-${Date.now().toString(36)}`;
    const instance: EntityInstance = {
      entityId,
      assetId,
      assetRevision: revision,
      transform: {
        position,
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      },
      cellId,
      visible: true,
      tags,
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

  getInstance(entityId: string): EntityInstance | null {
    return this.instances.get(entityId) ?? null;
  }

  listInstances(): EntityInstance[] {
    return Array.from(this.instances.values());
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
      latestHash: revs[revs.length - 1]!.contentHash,
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

  // -------------------------------------------------------------------------
  // Persistence (fs-backed; world-asset-store pattern)
  // -------------------------------------------------------------------------

  /**
   * Persist the full registry to the storage directory as JSON. GLB bytes
   * are stored base64 so a reload reproduces byte-identical hashes.
   */
  async persist(dir?: string): Promise<string> {
    const target = dir ?? this.storageDir;
    if (!target) throw new Error('AssetRegistry has no storage dir configured');
    await mkdir(target, { recursive: true });
    const snapshot = this.toSnapshot();
    const path = join(target, 'asset-registry.json');
    await writeFile(path, JSON.stringify(snapshot), 'utf-8');
    return path;
  }

  /**
   * Load a registry from disk (fresh instance — hashes must match).
   */
  static async load(dir: string): Promise<AssetRegistry> {
    const path = join(dir, 'asset-registry.json');
    if (!existsSync(path)) throw new Error(`No registry snapshot at ${path}`);
    const snapshot = JSON.parse(await readFile(path, 'utf-8')) as RegistrySnapshot;
    const registry = new AssetRegistry(dir);
    registry.fromSnapshot(snapshot);
    return registry;
  }

  toSnapshot(): RegistrySnapshot {
    return {
      revisions: Array.from(this.revisions.entries()).map(([assetId, revs]) => ({
        assetId,
        revisions: revs.map((r) => ({
          assetId: r.assetId,
          revision: r.revision,
          contentHash: r.contentHash,
          semanticHash: r.semanticHash,
          glbBase64: r.glbBytes ? Buffer.from(r.glbBytes).toString('base64') : null,
          vertexCount: r.vertexCount,
          faceCount: r.faceCount,
          triangleCount: r.triangleCount,
          materialCount: r.materialCount,
          createdAt: r.createdAt,
          source: r.source,
          artifacts: r.artifacts,
        })),
      })),
      instances: Array.from(this.instances.values()),
      cells: Array.from(this.cells.values()),
      entityCounter: this.entityCounter,
      cellCounter: this.cellCounter,
    };
  }

  fromSnapshot(snapshot: RegistrySnapshot): void {
    this.revisions.clear();
    this.instances.clear();
    this.cells.clear();
    for (const entry of snapshot.revisions) {
      this.revisions.set(
        entry.assetId,
        entry.revisions.map((r) => ({
          assetId: r.assetId,
          revision: r.revision,
          contentHash: r.contentHash,
          semanticHash: r.semanticHash,
          glbBytes: r.glbBase64 ? new Uint8Array(Buffer.from(r.glbBase64, 'base64')) : null,
          vertexCount: r.vertexCount,
          faceCount: r.faceCount,
          triangleCount: r.triangleCount,
          materialCount: r.materialCount,
          createdAt: r.createdAt,
          source: r.source,
          artifacts: r.artifacts,
        })),
      );
    }
    for (const inst of snapshot.instances) {
      this.instances.set(inst.entityId, inst);
    }
    for (const cell of snapshot.cells) {
      this.cells.set(cell.cellId, cell);
    }
    this.entityCounter = snapshot.entityCounter ?? this.instances.size;
    this.cellCounter = snapshot.cellCounter ?? this.cells.size;
  }
}

export interface RegistrySnapshot {
  revisions: Array<{
    assetId: string;
    revisions: Array<{
      assetId: string;
      revision: number;
      contentHash: string;
      semanticHash: string;
      glbBase64: string | null;
      vertexCount: number;
      faceCount: number;
      triangleCount: number;
      materialCount: number;
      createdAt: string;
      source: AssetSource;
      artifacts: DerivedArtifact[];
    }>;
  }>;
  instances: EntityInstance[];
  cells: WorldCellV2[];
  entityCounter?: number;
  cellCounter?: number;
}

// Singleton
let registryInstance: AssetRegistry | null = null;

export function getAssetRegistry(): AssetRegistry {
  if (!registryInstance) {
    registryInstance = new AssetRegistry();
  }
  return registryInstance;
}
