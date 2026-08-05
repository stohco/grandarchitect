/**
 * Derived Artifact Coordinator
 * ============================
 *
 * Compiles source truth (WorldCell state) into derived artifacts
 * (render meshes, collision meshes, navigation meshes, etc.).
 *
 * CRITICAL INVARIANT: All derivatives for a given cell must identify
 * the same source revision. If the render mesh is at revision 5 but
 * the collision mesh is at revision 4, the player will walk through
 * a visible wall. Activation must be atomic.
 *
 * Architecture:
 *
 *   Source Truth (WorldCell)
 *       ↓ compile (per-artifact-kind)
 *   Derived Artifacts (render, collision, nav, vegetation, ...)
 *       ↓ validate (revision match)
 *   Atomic Activation Bundle
 *       ↓ swap
 *   Visible + Playable Result
 */

import type {
  WorldCell,
  ArtifactReference,
  ArtifactKind,
  VolumetricRegionReference,
} from './world-fabric';

// ---------------------------------------------------------------------------
// Coordinator Types
// ---------------------------------------------------------------------------

export interface PendingArtifact {
  cellId: string;
  kind: ArtifactKind;
  sourceRevision: number;
  /** Compilation status. */
  status: 'queued' | 'compiling' | 'compiled' | 'failed';
  /** The compiled artifact (if status === 'compiled'). */
  artifact?: ArtifactReference;
  /** Error message (if status === 'failed'). */
  error?: string;
  /** Compilation start time. */
  startedAt?: string;
  /** Compilation completion time. */
  completedAt?: string;
}

export interface ActivationBundle {
  cellId: string;
  /** The source revision all artifacts share. */
  sourceRevision: number;
  /** All artifacts that will activate together. */
  artifacts: ArtifactReference[];
  /** Whether the bundle is ready (all artifacts compiled). */
  ready: boolean;
  /** Missing artifact kinds (not yet compiled). */
  missing: ArtifactKind[];
}

export interface CoordinatorState {
  /** Pending artifacts by cell. */
  pending: Map<string, PendingArtifact[]>;
  /** Active artifacts by cell (currently visible/usable). */
  active: Map<string, ArtifactReference[]>;
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export class DerivedArtifactCoordinator {
  private state: CoordinatorState = {
    pending: new Map(),
    active: new Map(),
  };

  /**
   * Mark a cell's artifacts as dirty (need recompilation).
   * Called when a WorldTransaction modifies a cell.
   */
  invalidateCell(cellId: string, kinds: ArtifactKind[]): void {
    const pending: PendingArtifact[] = [];
    for (const kind of kinds) {
      pending.push({
        cellId,
        kind,
        sourceRevision: 0, // Will be set when cell is read
        status: 'queued',
      });
    }
    this.state.pending.set(cellId, pending);
  }

  /**
   * Queue artifact compilation for a cell.
   */
  queueCompilation(cell: WorldCell, kinds: ArtifactKind[]): void {
    const pending: PendingArtifact[] = [];
    for (const kind of kinds) {
      pending.push({
        cellId: cell.cellId,
        kind,
        sourceRevision: cell.revision,
        status: 'queued',
      });
    }
    this.state.pending.set(cell.cellId, pending);
  }

  /**
   * Check if a cell's activation bundle is ready (all artifacts compiled
   * at the same source revision).
   */
  isBundleReady(cellId: string): ActivationBundle | null {
    const pending = this.state.pending.get(cellId);
    if (!pending || pending.length === 0) {
      // No pending artifacts — check if active artifacts exist
      const active = this.state.active.get(cellId);
      if (active && active.length > 0) {
        return {
          cellId,
          sourceRevision: active[0].sourceRevision,
          artifacts: active,
          ready: true,
          missing: [],
        };
      }
      return null;
    }

    // Check if all pending artifacts are compiled
    const compiled = pending.filter((p) => p.status === 'compiled' && p.artifact);
    const missing = pending
      .filter((p) => p.status !== 'compiled')
      .map((p) => p.kind);

    if (missing.length > 0) {
      return {
        cellId,
        sourceRevision: pending[0].sourceRevision,
        artifacts: compiled.map((p) => p.artifact!),
        ready: false,
        missing,
      };
    }

    // All compiled — verify same source revision
    const revisions = new Set(compiled.map((p) => p.sourceRevision));
    if (revisions.size > 1) {
      // REVISION MISMATCH — this is the catastrophic failure case
      console.error(
        `[DerivedArtifactCoordinator] REVISION MISMATCH for cell ${cellId}: ` +
          `artifacts have different source revisions ${Array.from(revisions).join(', ')}. ` +
          `Refusing to activate — would cause render/collision desync.`,
      );
      return {
        cellId,
        sourceRevision: -1,
        artifacts: compiled.map((p) => p.artifact!),
        ready: false,
        missing: [],
      };
    }

    return {
      cellId,
      sourceRevision: compiled[0].sourceRevision,
      artifacts: compiled.map((p) => p.artifact!),
      ready: true,
      missing: [],
    };
  }

  /**
   * Atomically activate a cell's artifact bundle.
   * Only succeeds if ALL artifacts are compiled at the same revision.
   */
  activateBundle(cellId: string): boolean {
    const bundle = this.isBundleReady(cellId);
    if (!bundle || !bundle.ready) {
      return false;
    }

    // Swap: pending → active
    this.state.active.set(cellId, bundle.artifacts);
    this.state.pending.delete(cellId);
    return true;
  }

  /**
   * Get the active artifacts for a cell.
   */
  getActiveArtifacts(cellId: string): ArtifactReference[] {
    return this.state.active.get(cellId) ?? [];
  }

  /**
   * Get pending artifacts for a cell (for UI display).
   */
  getPendingArtifacts(cellId: string): PendingArtifact[] {
    return this.state.pending.get(cellId) ?? [];
  }

  /**
   * Get coordinator state summary (for debugging).
   */
  getSummary(): {
    cellsWithPending: number;
    cellsWithActive: number;
    totalPendingArtifacts: number;
    totalActiveArtifacts: number;
  } {
    let totalPending = 0;
    for (const pending of this.state.pending.values()) {
      totalPending += pending.length;
    }
    let totalActive = 0;
    for (const active of this.state.active.values()) {
      totalActive += active.length;
    }
    return {
      cellsWithPending: this.state.pending.size,
      cellsWithActive: this.state.active.size,
      totalPendingArtifacts: totalPending,
      totalActiveArtifacts: totalActive,
    };
  }
}

// Singleton
let coordinatorInstance: DerivedArtifactCoordinator | null = null;

export function getCoordinator(): DerivedArtifactCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new DerivedArtifactCoordinator();
  }
  return coordinatorInstance;
}
