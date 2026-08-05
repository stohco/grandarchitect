/**
 * World Asset Store — durable persistence for operation graphs and bundles
 *
 * The critique demanded: "Demonstrate save, runtime restart, reload,
 * reevaluation and matching artifact hashes. In-process serialize/deserialize
 * alone does not satisfy persistence."
 *
 * This provides a filesystem-backed store that survives server restarts.
 * In production, this would use browser persistent storage or a database.
 */

import { writeFile, readFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const STORAGE_DIR = join(process.cwd(), 'data', 'world-store');

// ============================================================================
// Storage interface
// ============================================================================

export interface WorldAssetStore {
  saveGraph(graph: SerializedOperationGraph): Promise<void>;
  loadGraph(graphId: string): Promise<SerializedOperationGraph | null>;
  listGraphs(): Promise<string[]>;

  saveBundle(bundle: SerializedDerivedBundle): Promise<void>;
  loadBundle(bundleId: string): Promise<SerializedDerivedBundle | null>;
  listBundles(): Promise<string[]>;

  saveWorldManifest(manifest: WorldManifest): Promise<void>;
  loadWorldManifest(): Promise<WorldManifest | null>;

  deleteGraph(graphId: string): Promise<boolean>;
  deleteBundle(bundleId: string): Promise<boolean>;
}

export interface SerializedOperationGraph {
  graphId: string;
  graphType: string;
  revision: number;
  serializedAt: string;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    pluginId: string;
    parameters: Record<string, unknown>;
    enabled: boolean;
    attributableTo: string;
    dependencies: string[];
  }>;
  activeBundleRevision?: number;
}

export interface SerializedDerivedBundle {
  bundleId: string;
  graphId: string;
  graphRevision: number;
  regionId: string;
  recipeHash: string;
  artifactHash: string;
  status: string;
  serializedAt: string;
  // Artifact summaries (not full geometry — too large for JSON storage)
  renderVertexCount: number;
  renderTriangleCount: number;
  collisionVertexCount: number;
  navigationPolygonCount: number;
  vegetationInstanceCount: number;
  validation: Record<string, boolean>;
}

export interface WorldManifest {
  worldId: string;
  worldName: string;
  createdAt: string;
  lastModified: string;
  graphIds: string[];
  activeBundleId?: string;
  graphRevisions: Record<string, number>;
}

// ============================================================================
// Filesystem implementation
// ============================================================================

export function createFilesystemWorldAssetStore(): WorldAssetStore {
  async function ensureDir() {
    if (!existsSync(STORAGE_DIR)) {
      await mkdir(STORAGE_DIR, { recursive: true });
    }
  }

  return {
    async saveGraph(graph: SerializedOperationGraph) {
      await ensureDir();
      const path = join(STORAGE_DIR, `graph-${graph.graphId}.json`);
      await writeFile(path, JSON.stringify(graph, null, 2));
    },

    async loadGraph(graphId: string) {
      const path = join(STORAGE_DIR, `graph-${graphId}.json`);
      try {
        const data = await readFile(path, 'utf-8');
        return JSON.parse(data) as SerializedOperationGraph;
      } catch {
        return null;
      }
    },

    async listGraphs() {
      await ensureDir();
      try {
        const files = await readdir(STORAGE_DIR);
        return files
          .filter(f => f.startsWith('graph-') && f.endsWith('.json'))
          .map(f => f.replace('graph-', '').replace('.json', ''));
      } catch {
        return [];
      }
    },

    async saveBundle(bundle: SerializedDerivedBundle) {
      await ensureDir();
      const path = join(STORAGE_DIR, `bundle-${bundle.bundleId}.json`);
      await writeFile(path, JSON.stringify(bundle, null, 2));
    },

    async loadBundle(bundleId: string) {
      const path = join(STORAGE_DIR, `bundle-${bundleId}.json`);
      try {
        const data = await readFile(path, 'utf-8');
        return JSON.parse(data) as SerializedDerivedBundle;
      } catch {
        return null;
      }
    },

    async listBundles() {
      await ensureDir();
      try {
        const files = await readdir(STORAGE_DIR);
        return files
          .filter(f => f.startsWith('bundle-') && f.endsWith('.json'))
          .map(f => f.replace('bundle-', '').replace('.json', ''));
      } catch {
        return [];
      }
    },

    async saveWorldManifest(manifest: WorldManifest) {
      await ensureDir();
      const path = join(STORAGE_DIR, 'world-manifest.json');
      await writeFile(path, JSON.stringify(manifest, null, 2));
    },

    async loadWorldManifest() {
      const path = join(STORAGE_DIR, 'world-manifest.json');
      try {
        const data = await readFile(path, 'utf-8');
        return JSON.parse(data) as WorldManifest;
      } catch {
        return null;
      }
    },

    async deleteGraph(graphId: string) {
      const path = join(STORAGE_DIR, `graph-${graphId}.json`);
      try { await unlink(path); return true; } catch { return false; }
    },

    async deleteBundle(bundleId: string) {
      const path = join(STORAGE_DIR, `bundle-${bundleId}.json`);
      try { await unlink(path); return true; } catch { return false; }
    },
  };
}
