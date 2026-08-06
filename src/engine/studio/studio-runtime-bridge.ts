/**
 * Studio-Runtime Bridge
 * =====================
 *
 * Connects the Live Studio to the Engine Runtime. Assets generated in the
 * studio enter the world through the authoritative command path:
 *
 *   Studio generates MeshKernel
 *     → GLB compilation
 *     → executeCommand('world.create-cell' or 'asset.place')
 *     → WorldRepository transaction
 *     → DerivedArtifactCoordinator invalidation
 *     → Atomic activation
 *
 * No asset bypasses the runtime. No direct scene mutation.
 */

import type { MeshKernel } from './mesh-kernel';
import { getMeshStats } from './mesh-kernel';
import { exportToGLB } from './glb-export';
import type { GLBExportResult } from './glb-export';
import { getEngineRuntime } from '../runtime/engine-runtime';
import type { PrincipalSession } from '../runtime/types';

// ---------------------------------------------------------------------------
// Asset Placement Result
// ---------------------------------------------------------------------------

export interface AssetPlacementResult {
  /** Whether the placement succeeded. */
  success: boolean;
  /** Transaction ID from the runtime. */
  transactionId?: string;
  /** World revision after placement. */
  worldRevision?: number;
  /** GLB export result. */
  glb?: GLBExportResult;
  /** Mesh stats. */
  meshStats?: ReturnType<typeof getMeshStats>;
  /** Error message if failed. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Place Asset in World
// ---------------------------------------------------------------------------

export async function placeAssetInWorld(
  kernel: MeshKernel,
  session: PrincipalSession,
  cellId: string,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number, number] = [0, 0, 0, 1],
  scale: [number, number, number] = [1, 1, 1],
): Promise<AssetPlacementResult> {
  const runtime = getEngineRuntime();

  try {
    // Step 1: Export MeshKernel to GLB
    const glb = exportToGLB(kernel);
    const meshStats = getMeshStats(kernel);

    // Step 2: Submit command through the authoritative path
    const result = await runtime.executeCommand(session, {
      commandId: `cmd-place-asset-${Date.now().toString(36)}`,
      type: 'world.create-cell',
      payload: {
        cellId,
        bounds: {
          min: [position[0] - 1, position[1] - 1, position[2] - 1],
          max: [position[0] + 1, position[1] + 1, position[2] + 1],
        },
        layers: ['authored-hero'],
        assetId: kernel.meshId,
        glbHash: glb.hash,
        glbSize: glb.sizeBytes,
        vertexCount: meshStats.vertexCount,
        faceCount: meshStats.faceCount,
        transform: { position, rotation, scale },
      },
      requestedBy: session.principal,
      baseRevision: runtime.world.getRevision(),
    });

    // Step 3: Invalidate derived artifacts
    for (const cellId of result.invalidatedCells) {
      runtime.coordinator.invalidateCell(cellId, ['render-mesh', 'collision-mesh', 'navigation-mesh']);
    }

    return {
      success: true,
      transactionId: result.transaction.id,
      worldRevision: result.transaction.resultRevision,
      glb,
      meshStats,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ---------------------------------------------------------------------------
// Place Structure in World
// ---------------------------------------------------------------------------

export async function placeStructureInWorld(
  kernel: MeshKernel,
  session: PrincipalSession,
  cellId: string,
  position: [number, number, number] = [0, 0, 0],
): Promise<AssetPlacementResult> {
  return placeAssetInWorld(kernel, session, cellId, position);
}

// ---------------------------------------------------------------------------
// Place Character in World
// ---------------------------------------------------------------------------

export async function placeCharacterInWorld(
  bodyKernel: MeshKernel,
  equipmentKernels: MeshKernel[],
  session: PrincipalSession,
  cellId: string,
  position: [number, number, number] = [0, 0, 0],
): Promise<AssetPlacementResult> {
  // For characters, we place the body first, then equipment as child cells
  const bodyResult = await placeAssetInWorld(bodyKernel, session, cellId, position);

  if (!bodyResult.success) {
    return bodyResult;
  }

  // Place equipment (each as a separate cell with parent reference)
  for (let i = 0; i < equipmentKernels.length; i++) {
    const eqKernel = equipmentKernels[i];
    const eqCellId = `${cellId}_eq_${i}`;
    const eqResult = await placeAssetInWorld(eqKernel, session, eqCellId, position);

    if (!eqResult.success) {
      console.warn(`[Studio-Runtime] Equipment ${i} placement failed: ${eqResult.error}`);
    }
  }

  return bodyResult;
}

// ---------------------------------------------------------------------------
// Get Studio-Runtime Status
// ---------------------------------------------------------------------------

export interface StudioRuntimeStatus {
  runtimeInitialized: boolean;
  worldRevision: number;
  worldCellCount: number;
  registeredCommandTypes: string[];
  coordinatorSummary: {
    cellsWithPending: number;
    cellsWithActive: number;
    totalPendingArtifacts: number;
    totalActiveArtifacts: number;
  };
}

export function getStudioRuntimeStatus(): StudioRuntimeStatus {
  const runtime = getEngineRuntime();
  const info = runtime.getInfo();

  return {
    runtimeInitialized: runtime.isInitialized(),
    worldRevision: info.revision,
    worldCellCount: info.cells,
    registeredCommandTypes: [
      'world.create-cell',
      'terrain.raise',
      'terrain.subtract-sphere',
      'terrain.subtract-capsule',
      'transaction.undo',
    ],
    coordinatorSummary: info.coordinator,
  };
}
