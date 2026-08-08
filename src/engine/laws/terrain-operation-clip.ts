/**
 * laws/terrain-operation-clip.ts — protection-aware terrain destruction clip
 * ==========================================================================
 *
 * Pipeline: candidate destruction volume → sample protection fields →
 * clip/reduce/redirect → surviving terrain operation → MatterRemovalEvent
 * for the surviving part ONLY.
 *
 * The candidate operation's sphere volume is intersected with every
 * ProtectedDomain whose formation is attached. Each domain contributes
 * geometricIntersectionVolume × protectionRetention(formation load result)
 * to the protected volume. The surviving operation removes only
 * (candidate − protected) m³ — the MatterSink emits exactly ONE event per
 * blast, for the surviving part only, so the matter-conservation ledger is
 * never double-counted (see matter-sink.ts invariants).
 *
 * If a formation's restrictionMultipliers carry an interaction category
 * redirect weight, a share of the incoming authority is redirected
 * (reflected) instead of absorbed — [DERIVED], defaults 0.
 *
 * Determinism: no RNG; the sink's seeded recovery draw is driven by the
 * operation id + seed, so identical inputs → identical events.
 */

import { MatterSink } from '../world/matter/matter-sink';
import { sphereVolumeFromTransform } from '../world/matter/matter-sink';
import type { MatterSinkResult } from '../world/matter/matter-sink';
import type { RemovalCauseType } from '../world/matter/matter-events';
import type { MaterialId } from '../world/matter/material-composition';
import type { TerrainDestructionOperation } from '../world/world-fabric';
import {
  domainIntersectionWithSphere,
  evaluateFormationLoad,
  protectionRetention,
  restrictionMultiplierFor,
} from './formation-core';
import type { FormationCore, ProtectedDomain } from './formation-core';
import type { FormationLoadEvent } from './formation-core';
import type { LawDomain } from './types';

/** Redirect weighting inside restrictionMultipliers (optional key). */
export const REDIRECT_KEY = 'redirect';

export interface TerrainOperationClipInput {
  /** The candidate destruction operation (the actor's full intent). */
  operation: TerrainDestructionOperation;
  protectedDomains: ProtectedDomain[];
  /** Formation cores keyed by formationId. */
  cores: Record<string, FormationCore>;
  /** Incoming authority per formation (resolved per domain by the caller
   *  when known; otherwise a flat value is used for all formations). */
  incomingAuthority?: number;
  materialId: MaterialId;
  cause: RemovalCauseType;
  tick: number;
  sink: MatterSink;
  actorId?: string;
  seed?: string;
}

export interface TerrainOperationClipResult {
  clipped: boolean;
  /** Candidate blast volume (m³). */
  candidateVolumeM3: number;
  /** Volume held by protections (m³) — this matter stays in the world. */
  protectedVolumeM3: number;
  /** Volume genuinely removed (m³) = surviving operation volume. */
  removedMatterVolumeM3: number;
  /** Redirected share of incoming authority (0..1). */
  redirectedShare: number;
  /** The surviving operation (scale adjusted to the clipped volume). */
  survivingOperation: TerrainDestructionOperation;
  /** Formation load events (one per intersected formation). */
  loadEvents: FormationLoadEvent[];
  /** The single MatterRemovalEvent for the surviving part (null if fully
   *  protected → no event is emitted at all: no double counting). */
  matterResult: MatterSinkResult | null;
}

export function clipTerrainOperation(input: TerrainOperationClipInput): TerrainOperationClipResult {
  const op = input.operation;
  const pos = op.transform.position ?? [0, 0, 0];
  const scale = op.transform.scale ?? [1, 1, 1];
  const blastRadius = (scale[0] + scale[1] + scale[2]) / 6;
  const candidateVolume = sphereVolumeFromTransform([scale[0], scale[1], scale[2]], op.strength);

  const seenFormations = new Set<string>();
  const loadEvents: FormationLoadEvent[] = [];
  let protectedVolume = 0;
  let redirectedShare = 0;

  for (const domain of input.protectedDomains) {
    if (seenFormations.has(domain.formationId)) continue;
    seenFormations.add(domain.formationId);
    const core = input.cores[domain.formationId];
    if (!core) continue;

    const { volumeM3, fractionOfSphere } = domainIntersectionWithSphere(domain, pos as [number, number, number], blastRadius);
    if (volumeM3 <= 0) continue;

    const incoming = input.incomingAuthority ?? op.strength * 100;
    const load = evaluateFormationLoad(core, incoming, input.tick);
    loadEvents.push(load);

    const retention = protectionRetention(load.result);
    const redirect = restrictionMultiplierFor(core, REDIRECT_KEY as LawDomain);
    redirectedShare = Math.max(redirectedShare, Math.min(1, Math.max(0, redirect)));
    protectedVolume += volumeM3 * retention;
  }

  const cappedProtected = Math.min(protectedVolume, candidateVolume);
  const survivingVolume = Math.max(0, candidateVolume - cappedProtected);
  const clipped = survivingVolume < candidateVolume - 1e-9;

  // Scale the surviving operation so its sphere volume matches the
  // surviving volume (V ∝ r³ → scale ∝ cbrt(V)).
  let survivingOp = op;
  if (clipped && candidateVolume > 0) {
    const ratio = survivingVolume / candidateVolume;
    const cbrtRatio = Math.cbrt(ratio);
    survivingOp = {
      ...op,
      transform: {
        ...op.transform,
        scale: [scale[0] * cbrtRatio, scale[1] * cbrtRatio, scale[2] * cbrtRatio],
      },
    };
  }

  let matterResult: MatterSinkResult | null = null;
  if (survivingVolume > 1e-6) {
    matterResult = input.sink.onTerrainDestruction(survivingOp, {
      materialId: input.materialId,
      cause: input.cause,
      seed: input.seed ?? `${op.id}:laws`,
      tick: input.tick,
      actorId: input.actorId,
      volumeOverrideM3: Math.round(survivingVolume * 10000) / 10000,
    });
  }

  return {
    clipped,
    candidateVolumeM3: Math.round(candidateVolume * 10000) / 10000,
    protectedVolumeM3: Math.round(cappedProtected * 10000) / 10000,
    removedMatterVolumeM3: Math.round(survivingVolume * 10000) / 10000,
    redirectedShare,
    survivingOperation: survivingOp,
    loadEvents,
    matterResult,
  };
}

/** Remaining-volume invariant helper: candidate = protected + removed. */
export function clipConservesVolume(result: TerrainOperationClipResult): boolean {
  return (
    Math.abs(
      result.candidateVolumeM3 - (result.protectedVolumeM3 + result.removedMatterVolumeM3),
    ) < 0.01
  );
}
